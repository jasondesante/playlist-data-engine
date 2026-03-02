/**
 * Simple playlist utility functions for quick data extraction
 * "No nonsense" functions that return arrays of basic data from playlists
 */

import type { ServerlessPlaylist, RawArweavePlaylist, PlaylistTrack } from '../core/types/Playlist.js';
import { MetadataExtractor } from '../core/parser/MetadataExtractor.js';

// =============================================================================
// TYPES
// =============================================================================

/** Input type that accepts both parsed and raw playlists */
export type PlaylistInput = ServerlessPlaylist | RawArweavePlaylist;

/** Simplified track object for getTracks() */
export interface SimpleTrack {
    title: string;
    artist: string;
    audio_url: string;
    image_url: string;
}

/** Track object with VRM data for getVRMTracks() */
export interface VRMTrack {
    title: string;
    artist: string;
    audio_url: string;
    image_url: string;
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
 * Extract image URL from a track (handles both parsed and raw)
 */
function extractImageUrlFromTrack(track: PlaylistTrack | RawArweavePlaylist['tracks'][number]): string | null {
    // Parsed track - has image_url directly
    if ('image_url' in track && typeof track.image_url === 'string') {
        return track.image_url;
    }

    // Raw track - needs metadata parsing
    if ('metadata' in track) {
        const parsed = MetadataExtractor.parseMetadata(track.metadata);
        if (parsed) {
            return MetadataExtractor.extractImageUrl(parsed);
        }
    }

    return null;
}

/**
 * Extract VRM URL from a track (handles both parsed and raw)
 * VRM is an optional field in track metadata
 */
function extractVRMFromTrack(track: PlaylistTrack | RawArweavePlaylist['tracks'][number]): string | null {
    // Parsed track - check if vrm exists in the track object
    if ('audio_url' in track) {
        // For parsed tracks, we need to check the raw metadata
        // The vrm field isn't part of the standard PlaylistTrack interface
        // so we need to access it through the raw metadata
        return null;
    }

    // Raw track - needs metadata parsing
    if ('metadata' in track) {
        const parsed = MetadataExtractor.parseMetadata(track.metadata);
        if (parsed && typeof parsed.vrm === 'string' && parsed.vrm) {
            return parsed.vrm;
        }
    }

    return null;
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
 * // [{ title: 'Song', artist: 'Artist', audio_url: '...', image_url: '...' }, ...]
 */
export function getTracks(playlist: PlaylistInput): SimpleTrack[] {
    const tracks: SimpleTrack[] = [];

    for (const track of playlist.tracks) {
        const audio_url = extractAudioUrlFromTrack(track);
        const image_url = extractImageUrlFromTrack(track);

        let title = '';
        let artist = '';

        // Parsed track
        if ('title' in track) {
            title = track.title || '';
            artist = track.artist || '';
        } else if ('metadata' in track) {
            // Raw track
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed) {
                title = MetadataExtractor.extractTitle(parsed) || '';
                artist = MetadataExtractor.extractArtist(parsed) || '';
            }
        }

        // Only include if we have at least an audio URL
        if (audio_url) {
            tracks.push({
                title,
                artist,
                audio_url,
                image_url: image_url || ''
            });
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
                    audio_url: MetadataExtractor.extractAudioUrl(parsed),
                    image_url: MetadataExtractor.extractImageUrl(parsed),
                    duration: parsed.duration,
                    genre: parsed.genre,
                    tags: parsed.tags,
                    bpm: parsed.bpm,
                    key: parsed.key,
                    album: parsed.album,
                    description: parsed.description,
                    attributes: MetadataExtractor.convertAttributes(parsed.attributes)
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
 * // [{ title: 'Song', artist: 'Artist', audio_url: '...', image_url: '...', vrm: '...' }, ...]
 */
export function getVRMTracks(playlist: PlaylistInput): VRMTrack[] {
    const tracks: VRMTrack[] = [];

    for (const track of playlist.tracks) {
        const vrm = extractVRMFromTrack(track);
        if (!vrm) continue;

        const audio_url = extractAudioUrlFromTrack(track);
        const image_url = extractImageUrlFromTrack(track);

        let title = '';
        let artist = '';

        // Parsed track
        if ('title' in track) {
            title = track.title || '';
            artist = track.artist || '';
        } else if ('metadata' in track) {
            // Raw track
            const parsed = MetadataExtractor.parseMetadata(track.metadata);
            if (parsed) {
                title = MetadataExtractor.extractTitle(parsed) || '';
                artist = MetadataExtractor.extractArtist(parsed) || '';
            }
        }

        tracks.push({
            title,
            artist,
            audio_url: audio_url || '',
            image_url: image_url || '',
            vrm
        });
    }

    return tracks;
}
