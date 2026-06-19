/**
 * Playlist-related type definitions
 * Based on specs/001-core-engine/SPEC.md
 */

import type { TrackExtrasInfo } from '../parser/TrackExtras.js';

/**
 * ServerlessPlaylist - The playlist container
 * This is the structure of the JSON file fetched directly from Arweave
 */
export interface ServerlessPlaylist {
    // --- Playlist Metadata ---
    name: string;           // Name of the playlist
    description?: string;   // Optional description
    image: string;          // URL to playlist cover art
    creator: string;        // Wallet address of the curator
    genre?: string;         // General genre of the playlist
    tags?: string[];        // Search tags
    version?: string;       // Metadata format version (e.g., "0.4")

    // --- v0.4 Playlist Type Fields ---
    playlist_type?: 'new' | 'remix' | 'ep' | 'lp' | 'single';
    original_playlist_tx_id?: string;  // For remixes — tx_id of original
    playlist_artist?: string;          // For ep/lp/single — artist name

    // --- The Content ---
    tracks: PlaylistTrack[]; // Array of flattened track objects
}

/**
 * PlaylistTrack - Single source of truth for a track
 * Result of merging "Outer Shell" (Blockchain Data) with "Inner Core" (Parsed Metadata)
 */
export interface PlaylistTrack {
    // --- Identity & Blockchain Data (The Outer Shell) ---
    id: string;             // e.g. "ethereum-0xContract-1" or "AR-{tx_id}"
    uuid: string;           // Unique instance ID for the game engine
    playlist_index: number; // Order in the playlist

    chain_name: string;     // e.g. "ethereum", "optimism", "AR"
    token_address?: string; // Contract Address (or 0x0 for files). Not present for AR chain.
    token_id?: string;      // Token ID (or 0 for files). Not present for AR chain.
    tx_id?: string;         // Arweave transaction ID (only present when chain_name is "AR")
    platform: string;       // e.g. "sound", "catalog", "contract-wizard"

    // --- Content Data (The Inner Core - Extracted from Metadata) ---
    title: string;          // Extracted via Naming Logic
    artist: string;         // Extracted via Artist Logic
    description?: string;   // Description of the track
    album?: string;         // Album name

    // --- Assets (The Extracted Media) ---
    image_url: string;      // The result of the Image Extraction Logic
    /** Optional thumbnail URL extracted from image_thumb or image_thumb_url fields */
    image_thumb_url?: string;
    audio_url: string;              // The result of the Audio Extraction Logic (compressed/preferred)
    /** Optional uncompressed audio URL for high-fidelity playback */
    audio_url_lossless?: string;    // Lossless audio (WAV/FLAC) when available
    duration: number;       // In seconds (parsed or estimated)

    // --- Meta Tags ---
    genre: string;          // Primary genre
    tags: string[];         // All tags lowercased
    bpm?: number;           // If available in metadata
    key?: string;           // If available in metadata

    // --- Raw Attributes (for edge cases) ---
    attributes?: Record<string, string | number>;

    // --- v0.4 IPFS Hash Fields (promoted from metadata interior) ---
    audio_ipfs_hash?: string;       // IPFS CID of the audio file
    artwork_ipfs_hash?: string;     // IPFS CID of the artwork/image file

    // --- Extras (stems, alternate mixes) ---
    extras?: TrackExtrasInfo;
}

/**
 * RawArweavePlaylist - The raw input schema
 * This is what the engine receives from Arweave before parsing
 */
export interface RawArweavePlaylist {
    name: string;
    image: string;
    creator: string;
    description?: string;
    genre?: string;
    tags?: string[];
    version?: string;
    playlist_type?: 'new' | 'remix' | 'ep' | 'lp' | 'single';
    original_playlist_tx_id?: string;
    playlist_artist?: string;
    tracks: Array<{
        // Outer Blockchain Data
        chain_name: string;
        token_address?: string;  // Not present for AR chain
        token_id?: string;       // Not present for AR chain
        tx_id?: string;          // Arweave transaction ID (only present when chain_name is "AR")
        platform: string;
        id?: string;
        uuid?: string;

        // v0.4 resolved wrapper fields (may be present on raw tracks from Arweave).
        // The parser prefers these over re-extracting from the metadata interior.
        // `artwork_url` is accepted as an alias for `image_url` (ApeTapes emits this name).
        audio_url?: string;       // Resolved best audio URL
        artwork_url?: string;     // Alias for image_url (read on input)
        image_url?: string;       // Resolved best image URL

        // v0.4 IPFS hash fields (may be promoted on raw tracks from Arweave)
        audio_ipfs_hash?: string;
        artwork_ipfs_hash?: string;

        // The Payload — stringified JSON or a plain JSON object.
        // parseMetadata() handles both formats transparently.
        metadata: string | Record<string, unknown>;
    }>;
}
