/**
 * Playlist-related type definitions
 * Based on ENGINE_DESIGN_DOCUMENT.md v2.0
 */

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
    audio_url: string;      // The result of the Audio Extraction Logic
    duration: number;       // In seconds (parsed or estimated)

    // --- Meta Tags ---
    genre: string;          // Primary genre
    tags: string[];         // All tags lowercased
    bpm?: number;           // If available in metadata
    key?: string;           // If available in metadata

    // --- Raw Attributes (for edge cases) ---
    attributes?: Record<string, string | number>;
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
    tracks: Array<{
        // Outer Blockchain Data
        chain_name: string;
        token_address?: string;  // Not present for AR chain
        token_id?: string;       // Not present for AR chain
        tx_id?: string;          // Arweave transaction ID (only present when chain_name is "AR")
        platform: string;
        id?: string;
        uuid?: string;

        // The Stringified Payload
        metadata: string; // "{ \"name\": \"Song\", \"audio_url\": ... }"
    }>;
}
