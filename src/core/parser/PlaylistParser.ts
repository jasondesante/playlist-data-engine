/**
 * Playlist parser - converts raw Arweave JSON to ServerlessPlaylist
 * Based on specs/001-core-engine/SPEC.md
 */

import type { ServerlessPlaylist, PlaylistTrack, RawArweavePlaylist } from '../types/Playlist.js';
import { MetadataExtractor } from './MetadataExtractor.js';
import { getTrackExtras } from './TrackExtras.js';
import { arweaveGatewayManager } from '../../utils/arweaveGatewayManager.js';
import { v4 as uuidv4 } from 'uuid';

export interface PlaylistParserOptions {
    /** Validate audio URLs (check for 404s) */
    validateAudioUrls?: boolean;

    /** Strict mode throws errors on invalid tracks */
    strict?: boolean;

    /** Timeout in milliseconds for audio URL validation (default: 5000ms) */
    audioUrlValidationTimeout?: number;

    /**
     * Whether to resolve image URLs (image_url, image_thumb_url) during parsing.
     * When true, Arweave image URLs will be resolved to working gateways.
     * Default: false (to maintain backward compatibility - consumers can resolve on-demand)
     */
    resolveImageUrls?: boolean;
}

export class PlaylistParser {
    private options: PlaylistParserOptions;

    constructor(options: PlaylistParserOptions = {}) {
        this.options = {
            validateAudioUrls: false,
            strict: false,
            audioUrlValidationTimeout: 5000,
            resolveImageUrls: false,
            ...options,
        };
    }

    /**
     * Parse raw Arweave playlist data into ServerlessPlaylist
     * Follows the flattening process from specs/001-core-engine/SPEC.md
     */
    async parse(data: RawArweavePlaylist): Promise<ServerlessPlaylist> {
        // Extract playlist-level metadata
        const playlistName = data.name;
        const playlistImage = data.image;
        const playlistCreator = data.creator;
        const playlistDescription = data.description;
        const playlistGenre = data.genre;
        const playlistTags = data.tags;

        // Resolve playlist image URL if needed
        let resolvedPlaylistImage = playlistImage;
        if (playlistImage && this.options.resolveImageUrls) {
            resolvedPlaylistImage = await arweaveGatewayManager.resolveUrl(playlistImage);
        }

        // Parse tracks
        const rawTracks = data.tracks || [];
        const tracks: PlaylistTrack[] = [];

        for (let i = 0; i < rawTracks.length; i++) {
            try {
                const track = await this.parseTrack(rawTracks[i], i);
                if (track) {
                    // Resolve image URLs if requested
                    const resolvedTrack = await this.resolveTrackUrls(track);
                    tracks.push(resolvedTrack);
                }
            } catch (error) {
                if (this.options.strict) {
                    throw error;
                }
                console.warn(`Failed to parse track at index ${i}:`, error);
            }
        }

        return {
            name: playlistName,
            description: playlistDescription,
            image: resolvedPlaylistImage,
            creator: playlistCreator,
            genre: playlistGenre,
            tags: playlistTags,
            version: data.version,
            playlist_type: data.playlist_type,
            original_playlist_tx_id: data.original_playlist_tx_id,
            playlist_artist: data.playlist_artist,
            tracks,
        };
    }

    /**
     * Resolve Arweave URLs in a track (image_url, image_thumb_url)
     * Only resolves if resolveImageUrls option is enabled
     */
    private async resolveTrackUrls(track: PlaylistTrack): Promise<PlaylistTrack> {
        if (!this.options.resolveImageUrls) {
            return track;
        }

        const resolvedTrack = { ...track };

        // Resolve image_url
        if (resolvedTrack.image_url) {
            resolvedTrack.image_url = await arweaveGatewayManager.resolveUrl(resolvedTrack.image_url);
        }

        // Resolve image_thumb_url if present
        if (resolvedTrack.image_thumb_url) {
            resolvedTrack.image_thumb_url = await arweaveGatewayManager.resolveUrl(resolvedTrack.image_thumb_url);
        }

        return resolvedTrack;
    }

    /**
     * Parse a single track following the flattening process
     * See specs/001-core-engine/SPEC.md
     */
    private async parseTrack(rawTrack: RawArweavePlaylist['tracks'][number], playlistIndex: number): Promise<PlaylistTrack | null> {
        // Step 1: Parse Metadata
        const parsedMetadata = MetadataExtractor.parseMetadata(rawTrack.metadata);
        if (!parsedMetadata && this.options.strict) {
            throw new Error(`Failed to parse metadata for track at index ${playlistIndex}`);
        }

        // Step 2: Initialize PlaylistTrack
        // Step 3: Map Outer Shell - Copy blockchain data directly
        const chainName = rawTrack.chain_name;
        const tokenAddress = rawTrack.token_address;
        const tokenId = rawTrack.token_id;
        const txId = rawTrack.tx_id;
        const platform = rawTrack.platform;

        // Generate or use existing id (see specs/001-core-engine/SPEC.md)
        // For Arweave (AR) chain, use tx_id instead of token_address/token_id
        const id = rawTrack.id || (
            chainName === 'AR'
                ? `AR-${txId}`
                : `${chainName}-${tokenAddress}-${tokenId}`
        );

        // Generate UUID if not provided
        const uuid = rawTrack.uuid || uuidv4();

        // Step 4: Run Extraction Logic
        const title = MetadataExtractor.extractTitle(parsedMetadata || {});
        const artist = MetadataExtractor.extractArtist(parsedMetadata || {});
        // Prefer a top-level wrapper image field (artwork_url or legacy image_url) if the
        // uploader already resolved one; otherwise extract from the metadata interior.
        const wrapperImageUrl = (typeof rawTrack.artwork_url === 'string' && rawTrack.artwork_url)
            || (typeof rawTrack.image_url === 'string' && rawTrack.image_url)
            || null;
        const imageUrl = wrapperImageUrl || MetadataExtractor.extractImageUrl(parsedMetadata || {});
        const imageThumbUrl = MetadataExtractor.extractImageThumbUrl(parsedMetadata || {});
        const wrapperAudioUrl = (typeof rawTrack.audio_url === 'string' && rawTrack.audio_url) || null;
        const audioUrl = wrapperAudioUrl || MetadataExtractor.extractAudioUrl(parsedMetadata || {});
        const audioUrlLossless = MetadataExtractor.extractAudioUrlLossless(parsedMetadata || {});

        // Step 6: Validate - If audio_url is empty, mark as "Unsummonable"
        if (!audioUrl) {
            if (this.options.strict) {
                throw new Error(`No audio URL found for track: ${title || id}`);
            }
            console.warn(`Track ${id} has no audio URL - marked as Unsummonable`);
            return null;
        }

        // Optional: Validate audio URL accessibility
        if (this.options.validateAudioUrls) {
            const isValid = await this.validateAudioUrl(audioUrl);
            if (!isValid) {
                if (this.options.strict) {
                    throw new Error(`Audio URL validation failed for track: ${title || id}`);
                }
                console.warn(`Track ${id} has invalid audio URL - marked as Unsummonable`);
                return null;
            }
        }

        // Validate required fields
        if (!title || !artist || !imageUrl) {
            if (this.options.strict) {
                throw new Error(`Missing required fields for track: ${JSON.stringify({ title, artist, imageUrl })}`);
            }
            return null;
        }

        // Extract optional fields from parsed metadata
        const description = typeof parsedMetadata?.description === 'string' ? parsedMetadata.description : undefined;
        const album = typeof parsedMetadata?.album === 'string' ? parsedMetadata.album : undefined;
        const duration = parsedMetadata?.duration ? Number(parsedMetadata.duration) : 0;
        const genre = MetadataExtractor.extractGenre(parsedMetadata || {});
        const tags = parsedMetadata?.tags || [];
        const bpm = parsedMetadata?.bpm ? Number(parsedMetadata.bpm) : undefined;
        const key = typeof parsedMetadata?.key === 'string' ? parsedMetadata.key : undefined;

        // Step 5: Merge Attributes - Convert OpenSea-style attributes array
        const attributes = MetadataExtractor.convertAttributes(parsedMetadata?.attributes);

        // Extract track extras (stems, alternate mixes)
        const extras = getTrackExtras(parsedMetadata || {});

        const track: PlaylistTrack = {
            id,
            uuid,
            playlist_index: playlistIndex,
            chain_name: chainName,
            platform,
            title,
            artist,
            description,
            album,
            image_url: imageUrl,
            audio_url: audioUrl,
            audio_url_lossless: audioUrlLossless && audioUrlLossless !== audioUrl ? audioUrlLossless : undefined,
            duration,
            genre,
            tags: Array.isArray(tags) ? tags.map(t => String(t).toLowerCase()) : [],
            bpm,
            key,
            attributes: attributes || undefined,
            extras,
        };

        // Add image_thumb_url if present (per design decision: only add if exists)
        if (imageThumbUrl) {
            track.image_thumb_url = imageThumbUrl;
        }

        // v0.4 IPFS hash fields — prefer top-level track field, fall back to parsed metadata interior.
        // Mint-* fields live ONLY inside the metadata interior and are never promoted onto the wrapper.
        if (typeof parsedMetadata?.audio_ipfs_hash === 'string') {
            track.audio_ipfs_hash = rawTrack.audio_ipfs_hash || parsedMetadata.audio_ipfs_hash;
        } else if (rawTrack.audio_ipfs_hash) {
            track.audio_ipfs_hash = rawTrack.audio_ipfs_hash;
        }
        if (typeof parsedMetadata?.artwork_ipfs_hash === 'string') {
            track.artwork_ipfs_hash = rawTrack.artwork_ipfs_hash || parsedMetadata.artwork_ipfs_hash;
        } else if (rawTrack.artwork_ipfs_hash) {
            track.artwork_ipfs_hash = rawTrack.artwork_ipfs_hash;
        }

        // Add token_address and token_id for non-Arweave chains
        if (chainName !== 'AR') {
            track.token_address = tokenAddress;
            track.token_id = tokenId;
        } else if (txId) {
            // Add tx_id for Arweave chains
            track.tx_id = txId;
        }

        return track;
    }

    /**
     * Validate that an audio URL is accessible
     * @param url - The audio URL to validate
     * @returns Promise<boolean> - true if URL is accessible, false otherwise
     */
    private async validateAudioUrl(url: string): Promise<boolean> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.audioUrlValidationTimeout);

        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                console.warn(`Audio URL validation timed out after ${this.options.audioUrlValidationTimeout}ms: ${url}`);
            } else {
                console.warn(`Audio URL validation failed for ${url}:`, error);
            }
            return false;
        }
    }
}
