/**
 * Simple playlist utility functions for quick data extraction
 * "No nonsense" functions that return arrays of basic data from playlists
 */

import type { ServerlessPlaylist, RawArweavePlaylist, PlaylistTrack } from '../core/types/Playlist.js';
import { MetadataExtractor } from '../core/parser/MetadataExtractor.js';
import { getTrackExtras, resolveSelectedMix, type MixInfo, type SelectedMixInfo } from '../core/parser/TrackExtras.js';

// =============================================================================
// TYPES
// =============================================================================

/** Input type that accepts both parsed and raw playlists */
export type PlaylistInput = ServerlessPlaylist | RawArweavePlaylist;

/** Simplified track object for getTracks() */
export interface SimpleTrack {
    title: string;
    artist: string;
    description?: string;
    audio_url: string;
    audio_url_lossless?: string;
    image_url: string;
    image_thumb_url?: string;
    audio_ipfs_hash?: string;
    artwork_ipfs_hash?: string;
    mint_function?: string;
    mint_price?: string;
    mint_snapshot_time?: number;
    mint_token?: string;
    /** Name of the entry's pinned mix (absent when the entry plays primary audio) */
    selected_mix?: string;
}

/** Track object with mix data for getMixTracks() */
export interface MixTrackInfo {
    title: string;
    artist: string;
    description?: string;
    /** The entry's audio URL, already repointed when the entry pins a mix */
    audio_url: string;
    audio_url_lossless?: string;
    image_url: string;
    /** Name of the entry's pinned mix (absent when the entry plays primary audio) */
    selected_mix?: string;
    /** All mixes the track ships */
    mixes: MixInfo[];
}

/** Track object with VRM data for getVRMTracks() */
export interface VRMTrack {
    title: string;
    artist: string;
    description?: string;
    audio_url: string;
    audio_url_lossless?: string;
    image_url: string;
    image_thumb_url?: string;
    vrm: string;
}

// =============================================================================
// EXTRACTION HELPERS
// =============================================================================

/**
 * Extract audio URL from a track (handles both parsed and raw)
 */
function extractAudioUrlFromTrack(track: PlaylistTrack | RawArweavePlaylist['tracks'][number]): string | null {
    // Parsed track - has audio_url directly
    if ('audio_url' in track && typeof track.audio_url === 'string') {
        return track.audio_url;
    }

    // Raw track - needs metadata parsing
    if ('metadata' in track) {
        const parsed = MetadataExtractor.parseMetadata(track.metadata);
        if (parsed) {
            return MetadataExtractor.extractAudioUrl(parsed);
        }
    }

    return null;
}

/**
 * Extract lossless audio URL from a track (handles both parsed and raw)
 */
function extractAudioUrlLosslessFromTrack(track: PlaylistTrack | RawArweavePlaylist['tracks'][number]): string | null {
    // Parsed track - has audio_url_lossless directly
    if ('audio_url_lossless' in track && typeof track.audio_url_lossless === 'string') {
        return track.audio_url_lossless;
    }

    // Raw track - needs metadata parsing
    if ('metadata' in track) {
        const parsed = MetadataExtractor.parseMetadata(track.metadata);
        if (parsed) {
            return MetadataExtractor.extractAudioUrlLossless(parsed);
        }
    }

    return null;
}

/**
 * Extract image URL from a track (handles both parsed and raw)
 */
function extractImageUrlFromTrack(track: PlaylistTrack | RawArweavePlaylist['tracks'][number]): string | null {
    // Parsed track - has image_url directly
    if ('image_url' in track && typeof track.image_url === 'string') {
        return track.image_url;
    }

    // Raw track - check wrapper image fields, then parse metadata
    if ('metadata' in track) {
        // artwork_url wrapper field (ApeTapes emits this name; alias for image_url)
        if ('artwork_url' in track && typeof track.artwork_url === 'string') {
            return track.artwork_url;
        }
        const parsed = MetadataExtractor.parseMetadata(track.metadata);
        if (parsed) {
            return MetadataExtractor.extractImageUrl(parsed);
        }
    }

    return null;
}

/**
 * Extract image thumb URL from a track (handles both parsed and raw)
 * Unlike extractImageUrlFromTrack, this specifically targets thumbnail fields only.
 */
function extractImageThumbUrlFromTrack(track: PlaylistTrack | RawArweavePlaylist['tracks'][number]): string | null {
    // Parsed track - has image_thumb_url directly
    if ('image_thumb_url' in track && typeof track.image_thumb_url === 'string') {
        return track.image_thumb_url;
    }

    // Raw track - needs metadata parsing
    if ('metadata' in track) {
        const parsed = MetadataExtractor.parseMetadata(track.metadata);
        if (parsed) {
            return MetadataExtractor.extractImageThumbUrl(parsed);
        }
    }

    return null;
}

/**
 * Extract VRM URL from a track (handles both parsed and raw)
 * VRM is an optional field in track metadata
 */
function extractVRMFromTrack(track: PlaylistTrack | RawArweavePlaylist['tracks'][number]): string | null {
    // Raw track - the payload metadata is authoritative, even when the v0.4
    // wrapper fields (audio_url & friends) are also present on the track.
    if ('metadata' in track) {
        const parsed = MetadataExtractor.parseMetadata(track.metadata);
        if (parsed && typeof parsed.vrm === 'string' && parsed.vrm) {
            return parsed.vrm;
        }
    }

    // Parsed track - the parser promotes vrm into extras
    if ('extras' in track && track.extras && typeof track.extras.vrm === 'string') {
        return track.extras.vrm || null;
    }

    return null;
}

/**
 * Extract a track's mixes (handles both parsed and raw).
 * Parsed tracks carry them in extras; raw tracks need the metadata parsed.
 */
function extractMixesFromTrack(track: PlaylistTrack | RawArweavePlaylist['tracks'][number]): MixInfo[] {
    if ('extras' in track && track.extras?.mixes) {
        return track.extras.mixes;
    }

    if ('metadata' in track) {
        const parsed = MetadataExtractor.parseMetadata(track.metadata);
        if (parsed) {
            return getTrackExtras(parsed).mixes ?? [];
        }
    }

    return [];
}

/**
 * Resolve a raw track's pinned mix the way the parser would at parse time.
 * Parsed tracks already carry the applied pin, so they resolve to null here.
 */
function extractPinFromTrack(track: PlaylistTrack | RawArweavePlaylist['tracks'][number]): SelectedMixInfo | null {
    if ('audio_url' in track || !('metadata' in track)) {
        return null;
    }

    const parsed = MetadataExtractor.parseMetadata(track.metadata);
    return resolveSelectedMix(
        track.selected_mix,
        MetadataExtractor.convertAttributes(parsed?.attributes),
        parsed ? getTrackExtras(parsed).mixes : undefined
    );
}

// =============================================================================
// ARRAY EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Get all audio URLs from a playlist
 * @param playlist - Parsed or raw playlist
 * @returns Array of audio URLs (excludes null/empty)
 *
 * @example
 * const urls = getAudioUrls(playlist);
 * // ['https://arweave.net/audio1.mp3', 'https://arweave.net/audio2.mp3']
 */
export function getAudioUrls(playlist: PlaylistInput): string[] {
    const urls: string[] = [];

    for (const track of playlist.tracks) {
        const url = extractAudioUrlFromTrack(track);
        if (url) {
            urls.push(url);
        }
    }

    return urls;
}

/**
 * Get all image URLs from playlist tracks
 * @param playlist - Parsed or raw playlist
 * @returns Array of image URLs (excludes null/empty)
 *
 * @example
 * const images = getImageUrls(playlist);
 * // ['https://arweave.net/cover1.jpg', 'https://arweave.net/cover2.jpg']
 */
export function getImageUrls(playlist: PlaylistInput): string[] {
    const urls: string[] = [];

    for (const track of playlist.tracks) {
        const url = extractImageUrlFromTrack(track);
        if (url) {
            urls.push(url);
        }
    }

    return urls;
}

/**
 * Get all track titles from a playlist
 * @param playlist - Parsed or raw playlist
 * @returns Array of track titles
 *
 * @example
 * const titles = getTrackTitles(playlist);
 * // ['Song One', 'Song Two', 'Song Three']
 */
export function getTrackTitles(playlist: PlaylistInput): string[] {
    const titles: string[] = [];

    for (const track of playlist.tracks) {
        // Parsed track
        if ('title' in track && typeof track.title === 'string') {
            titles.push(track.title);
            continue;
        }

        // Raw track - parse metadata
        if ('metadata' in track) {
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed) {
                const title = MetadataExtractor.extractTitle(parsed);
                if (title) {
                    titles.push(title);
                }
            }
        }
    }

    return titles;
}

/**
 * Get all artist names from a playlist
 * @param playlist - Parsed or raw playlist
 * @returns Array of artist names
 *
 * @example
 * const artists = getArtists(playlist);
 * // ['Artist A', 'Artist B', 'Artist A']
 */
export function getArtists(playlist: PlaylistInput): string[] {
    const artists: string[] = [];

    for (const track of playlist.tracks) {
        // Parsed track
        if ('artist' in track && typeof track.artist === 'string') {
            artists.push(track.artist);
            continue;
        }

        // Raw track - parse metadata
        if ('metadata' in track) {
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed) {
                const artist = MetadataExtractor.extractArtist(parsed);
                if (artist) {
                    artists.push(artist);
                }
            }
        }
    }

    return artists;
}

/**
 * Get all genres from playlist tracks (unique, sorted)
 * @param playlist - Parsed or raw playlist
 * @returns Array of unique genres (sorted alphabetically)
 *
 * @example
 * const genres = getGenres(playlist);
 * // ['Electronic', 'Hip-Hop', 'Jazz']
 */
export function getGenres(playlist: PlaylistInput): string[] {
    const genreSet = new Set<string>();

    for (const track of playlist.tracks) {
        // Parsed track
        if ('genre' in track && typeof track.genre === 'string' && track.genre) {
            genreSet.add(track.genre);
            continue;
        }

        // Raw track - parse metadata
        if ('metadata' in track) {
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed && typeof parsed.genre === 'string' && parsed.genre) {
                genreSet.add(parsed.genre);
            }
        }
    }

    return Array.from(genreSet).sort();
}

/**
 * Get all tags from playlist tracks (unique, sorted, lowercased)
 * @param playlist - Parsed or raw playlist
 * @returns Array of unique tags (sorted alphabetically)
 *
 * @example
 * const tags = getTags(playlist);
 * // ['chill', 'electronic', 'upbeat']
 */
export function getTags(playlist: PlaylistInput): string[] {
    const tagSet = new Set<string>();

    for (const track of playlist.tracks) {
        // Parsed track
        if ('tags' in track && Array.isArray(track.tags)) {
            for (const tag of track.tags) {
                if (tag) {
                    tagSet.add(tag.toLowerCase());
                }
            }
            continue;
        }

        // Raw track - parse metadata
        if ('metadata' in track) {
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed && Array.isArray(parsed.tags)) {
                for (const tag of parsed.tags) {
                    if (tag) {
                        tagSet.add(String(tag).toLowerCase());
                    }
                }
            }
        }
    }

    return Array.from(tagSet).sort();
}

/**
 * Get total duration of all tracks in seconds
 * @param playlist - Parsed or raw playlist (requires duration in metadata)
 * @returns Total duration in seconds (0 if no duration data)
 *
 * @example
 * const duration = getTotalDuration(playlist);
 * // 1234.56
 */
export function getTotalDuration(playlist: PlaylistInput): number {
    let total = 0;

    for (const track of playlist.tracks) {
        // Parsed track
        if ('duration' in track && typeof track.duration === 'number') {
            total += track.duration;
            continue;
        }

        // Raw track - parse metadata
        if ('metadata' in track) {
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed && typeof parsed.duration === 'number') {
                total += parsed.duration;
            }
        }
    }

    return total;
}

/**
 * Get track count from a playlist
 * @param playlist - Parsed or raw playlist
 * @returns Number of tracks
 *
 * @example
 * const count = getTrackCount(playlist);
 * // 10
 */
export function getTrackCount(playlist: PlaylistInput): number {
    return playlist.tracks.length;
}

// =============================================================================
// OBJECT EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Get track data as simple objects (title + artist + urls)
 * @param playlist - Parsed or raw playlist
 * @returns Array of simplified track objects
 *
 * @example
 * const tracks = getTracks(playlist);
 * // [{ title: 'Song', artist: 'Artist', audio_url: '...', image_url: '...', image_thumb_url: '...' }, ...]
 */
export function getTracks(playlist: PlaylistInput): SimpleTrack[] {
    const tracks: SimpleTrack[] = [];

    for (const track of playlist.tracks) {
        let audio_url = extractAudioUrlFromTrack(track);
        const image_url = extractImageUrlFromTrack(track);
        const image_thumb_url = extractImageThumbUrlFromTrack(track);

        // Apply the entry's pin the way the parser would, so raw input yields
        // the same audio a parsed track would.
        const pin = extractPinFromTrack(track);
        if (pin?.audio_url) {
            audio_url = pin.audio_url;
        }
        const selected_mix = pin ? pin.name : ('audio_url' in track ? track.selected_mix : undefined);

        let title = '';
        let artist = '';
        let description: string | undefined;

        // Parsed track
        if ('title' in track) {
            title = track.title || '';
            artist = track.artist || '';
            // Parser already ran extractDescription on the metadata
            description = track.description || undefined;
        } else if ('metadata' in track) {
            // Raw track
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed) {
                title = MetadataExtractor.extractTitle(parsed) || '';
                artist = MetadataExtractor.extractArtist(parsed) || '';
                description = MetadataExtractor.extractDescription(parsed) || undefined;
            }
        }

        // Only include if we have at least an audio URL
        if (audio_url) {
            const simpleTrack: SimpleTrack = {
                title,
                artist,
                audio_url,
                image_url: image_url || ''
            };

            // Add lossless audio URL if present and different from primary.
            // A pinned entry's lossless master is the pin's, not the metadata's.
            const rawLossless = extractAudioUrlLosslessFromTrack(track);
            const audio_url_lossless = pin
                ? pin.audio_url_lossless
                : (rawLossless && rawLossless !== audio_url ? rawLossless : undefined);
            if (audio_url_lossless) {
                simpleTrack.audio_url_lossless = audio_url_lossless;
            }

            if (selected_mix) {
                simpleTrack.selected_mix = selected_mix;
            }

            // Only add image_thumb_url if present
            if (image_thumb_url) {
                simpleTrack.image_thumb_url = image_thumb_url;
            }

            // Only add description if present
            if (description) {
                simpleTrack.description = description;
            }

            // v0.4 IPFS hash fields
            if ('audio_ipfs_hash' in track && typeof track.audio_ipfs_hash === 'string') {
                simpleTrack.audio_ipfs_hash = track.audio_ipfs_hash;
            }
            if ('artwork_ipfs_hash' in track && typeof track.artwork_ipfs_hash === 'string') {
                simpleTrack.artwork_ipfs_hash = track.artwork_ipfs_hash;
            }

            // v0.4 mint fields (wrapper-level)
            if ('mint_function' in track && typeof track.mint_function === 'string') {
                simpleTrack.mint_function = track.mint_function;
            }
            if ('mint_price' in track && typeof track.mint_price === 'string') {
                simpleTrack.mint_price = track.mint_price;
            }
            if ('mint_snapshot_time' in track && typeof track.mint_snapshot_time === 'number') {
                simpleTrack.mint_snapshot_time = track.mint_snapshot_time;
            }
            if ('mint_token' in track && typeof track.mint_token === 'string') {
                simpleTrack.mint_token = track.mint_token;
            }

            tracks.push(simpleTrack);
        }
    }

    return tracks;
}

/**
 * Get full track data with all available fields
 * @param playlist - Parsed or raw playlist
 * @returns Array of track objects with all available data
 *
 * @example
 * const tracks = getFullTracks(playlist);
 * // [{ id, title, artist, album, duration, genre, tags, audio_url, image_url, ... }, ...]
 */
export function getFullTracks(playlist: PlaylistInput): Array<Record<string, unknown>> {
    const tracks: Array<Record<string, unknown>> = [];

    for (const track of playlist.tracks) {
        // Parsed track - return as-is (minus functions)
        if ('audio_url' in track) {
            tracks.push({ ...track });
            continue;
        }

        // Raw track - extract everything
        if ('metadata' in track) {
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed) {
                const extras = getTrackExtras(parsed);
                // Apply the entry's pin the way the parser would, so raw input
                // yields the same audio a parsed track would.
                const pin = resolveSelectedMix(
                    track.selected_mix,
                    MetadataExtractor.convertAttributes(parsed.attributes),
                    extras.mixes
                );
                const audioUrlLossless = MetadataExtractor.extractAudioUrlLossless(parsed);
                const primaryAudioUrl = MetadataExtractor.extractAudioUrl(parsed);
                const resolvedAudioUrl = pin?.audio_url || primaryAudioUrl;
                const resolvedLossless = pin
                    ? pin.audio_url_lossless
                    : (audioUrlLossless && audioUrlLossless !== resolvedAudioUrl ? audioUrlLossless : undefined);

                tracks.push({
                    id: track.chain_name === 'AR'
                        ? `AR-${track.tx_id}`
                        : `${track.chain_name}-${track.token_address}-${track.token_id}`,
                    chain_name: track.chain_name,
                    token_address: track.token_address,
                    token_id: track.token_id,
                    tx_id: track.tx_id,
                    platform: track.platform,
                    title: MetadataExtractor.extractTitle(parsed),
                    artist: MetadataExtractor.extractArtist(parsed),
                    audio_url: resolvedAudioUrl,
                    image_url: MetadataExtractor.extractImageUrl(parsed),
                    image_thumb_url: MetadataExtractor.extractImageThumbUrl(parsed),
                    duration: parsed.duration,
                    genre: parsed.genre,
                    tags: parsed.tags,
                    bpm: parsed.bpm,
                    key: parsed.key,
                    album: parsed.album,
                    description: MetadataExtractor.extractDescription(parsed),
                    attributes: MetadataExtractor.convertAttributes(parsed.attributes),
                    ...(resolvedLossless ? { audio_url_lossless: resolvedLossless } : {}),
                    ...(pin ? { selected_mix: pin.name } : {}),
                    ...(extras.hasExtras ? { extras } : {}),
                    // v0.4 IPFS hash + mint fields from the raw track wrapper
                    ...(track.audio_ipfs_hash ? { audio_ipfs_hash: track.audio_ipfs_hash } : {}),
                    ...(track.artwork_ipfs_hash ? { artwork_ipfs_hash: track.artwork_ipfs_hash } : {}),
                    ...(track.mint_function ? { mint_function: track.mint_function } : {}),
                    ...(track.mint_price ? { mint_price: track.mint_price } : {}),
                    ...(track.mint_snapshot_time ? { mint_snapshot_time: track.mint_snapshot_time } : {}),
                    ...(track.mint_token ? { mint_token: track.mint_token } : {}),
                });
            }
        }
    }

    return tracks;
}

// =============================================================================
// VRM EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Get all VRM URLs from playlist tracks
 * VRM is an optional field in track metadata (3D avatar model files)
 * @param playlist - Parsed or raw playlist
 * @returns Array of VRM URLs (only from tracks that have a vrm field)
 *
 * @example
 * const vrms = getVRMs(playlist);
 * // ['https://arweave.net/avatar1.vrm', 'https://arweave.net/avatar2.vrm']
 */
export function getVRMs(playlist: PlaylistInput): string[] {
    const vrms: string[] = [];

    for (const track of playlist.tracks) {
        const vrm = extractVRMFromTrack(track);
        if (vrm) {
            vrms.push(vrm);
        }
    }

    return vrms;
}

/**
 * Get tracks that have VRM data (3D avatar model files)
 * Returns simplified track objects with vrm field included
 * @param playlist - Parsed or raw playlist
 * @returns Array of track objects that have a vrm field
 *
 * @example
 * const vrmTracks = getVRMTracks(playlist);
 * // [{ title: 'Song', artist: 'Artist', audio_url: '...', image_url: '...', image_thumb_url: '...', vrm: '...' }, ...]
 */
export function getVRMTracks(playlist: PlaylistInput): VRMTrack[] {
    const tracks: VRMTrack[] = [];

    for (const track of playlist.tracks) {
        const vrm = extractVRMFromTrack(track);
        if (!vrm) continue;

        const audio_url = extractAudioUrlFromTrack(track);
        const image_url = extractImageUrlFromTrack(track);
        const image_thumb_url = extractImageThumbUrlFromTrack(track);

        let title = '';
        let artist = '';
        let description: string | undefined;

        // Parsed track
        if ('title' in track) {
            title = track.title || '';
            artist = track.artist || '';
            // Parser already ran extractDescription on the metadata
            description = track.description || undefined;
        } else if ('metadata' in track) {
            // Raw track
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed) {
                title = MetadataExtractor.extractTitle(parsed) || '';
                artist = MetadataExtractor.extractArtist(parsed) || '';
                description = MetadataExtractor.extractDescription(parsed) || undefined;
            }
        }

        const vrmTrack: VRMTrack = {
            title,
            artist,
            audio_url: audio_url || '',
            image_url: image_url || '',
            vrm
        };

        // Only add image_thumb_url if present
        if (image_thumb_url) {
            vrmTrack.image_thumb_url = image_thumb_url;
        }

        // Only add description if present
        if (description) {
            vrmTrack.description = description;
        }

        tracks.push(vrmTrack);
    }

    return tracks;
}

// =============================================================================
// MIX EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Get all alternate mixes across a playlist's tracks
 * @param playlist - Parsed or raw playlist
 * @returns Array of mixes (flattened across tracks, in track order)
 *
 * @example
 * const mixes = getMixes(playlist);
 * // [{ name: 'Instrumental', uri: '...', mime_type: 'audio/mpeg', conditions: [] }, ...]
 */
export function getMixes(playlist: PlaylistInput): MixInfo[] {
    const mixes: MixInfo[] = [];

    for (const track of playlist.tracks) {
        mixes.push(...extractMixesFromTrack(track));
    }

    return mixes;
}

/**
 * Get tracks that ship alternate mixes, with each entry's pin resolved
 * @param playlist - Parsed or raw playlist
 * @returns Array of track objects with their mixes and pinned mix name
 *
 * @example
 * const mixTracks = getMixTracks(playlist);
 * // [{ title: 'Song', artist: 'Artist', audio_url: '...', selected_mix: 'Instrumental', mixes: [...] }, ...]
 */
export function getMixTracks(playlist: PlaylistInput): MixTrackInfo[] {
    const tracks: MixTrackInfo[] = [];

    for (const track of playlist.tracks) {
        const mixes = extractMixesFromTrack(track);
        if (mixes.length === 0) continue;

        const pin = extractPinFromTrack(track);

        let title = '';
        let artist = '';
        let description: string | undefined;

        // Parsed track
        if ('title' in track) {
            title = track.title || '';
            artist = track.artist || '';
            // Parser already ran extractDescription on the metadata
            description = track.description || undefined;
        } else if ('metadata' in track) {
            // Raw track
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed) {
                title = MetadataExtractor.extractTitle(parsed) || '';
                artist = MetadataExtractor.extractArtist(parsed) || '';
                description = MetadataExtractor.extractDescription(parsed) || undefined;
            }
        }

        // A parsed track's audio URLs are already pin-repointed by the parser;
        // a raw track's need the pin applied here.
        let audio_url = extractAudioUrlFromTrack(track) || '';
        let audio_url_lossless: string | undefined;
        if (pin) {
            audio_url = pin.audio_url || audio_url;
            audio_url_lossless = pin.audio_url_lossless;
        } else {
            const rawLossless = extractAudioUrlLosslessFromTrack(track);
            audio_url_lossless = rawLossless && rawLossless !== audio_url ? rawLossless : undefined;
        }

        const selected_mix = pin
            ? pin.name
            : ('audio_url' in track ? track.selected_mix : undefined);

        tracks.push({
            title,
            artist,
            audio_url,
            image_url: extractImageUrlFromTrack(track) || '',
            ...(audio_url_lossless ? { audio_url_lossless } : {}),
            ...(selected_mix ? { selected_mix } : {}),
            ...(description ? { description } : {}),
            mixes,
        });
    }

    return tracks;
}
