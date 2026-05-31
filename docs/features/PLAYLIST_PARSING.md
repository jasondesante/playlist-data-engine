# Playlist Parsing

## Overview

The playlist parsing pipeline converts raw playlist data (from Arweave, IPFS, or any JSON source) into structured `ServerlessPlaylist` objects with normalized track fields. It handles metadata extraction with priority-queue logic across platforms, URL resolution, and track extras (stems, alternate mixes with condition evaluation).

```
Raw JSON (Arweave/IPFS)
    │
    ▼
PlaylistParser.parse()
    │  Flattens raw data → ServerlessPlaylist
    │  MetadataExtractor extracts: audio, image, title, artist, genre
    │  Optionally resolves Arweave image URLs via gateway manager
    │
    ▼
ServerlessPlaylist
    │  tracks[].audio_url, image_url, title, artist, ...
    │
    ├──► getTrackMetadata()       Full raw metadata (external_url, credits, etc.)
    ├──► getTrackExtras()         Stems and alternate mixes with conditions
    ├──► evaluateMixConditions()  Which mixes are available right now
    └──► isIPFS / resolveIPFSLink()  IPFS URL detection and resolution
```

---

## Source Files

| Component | Location |
|-----------|----------|
| PlaylistParser | [src/core/parser/PlaylistParser.ts](../../src/core/parser/PlaylistParser.ts) |
| MetadataExtractor | [src/core/parser/MetadataExtractor.ts](../../src/core/parser/MetadataExtractor.ts) |
| Track Extras | [src/core/parser/TrackExtras.ts](../../src/core/parser/TrackExtras.ts) |
| Playlist Utilities | [src/utils/playlistUtils.ts](../../src/utils/playlistUtils.ts) |
| IPFS Utilities | [src/utils/ipfsUtils.ts](../../src/utils/ipfsUtils.ts) |
| Type Definitions | [src/core/types/Playlist.ts](../../src/core/types/Playlist.ts) |

---

## Parsed Playlist Structure

After parsing, you get a `ServerlessPlaylist` with a flat array of `PlaylistTrack` objects. Every track has consistent field names regardless of the source platform.

### ServerlessPlaylist

```
ServerlessPlaylist
├── name: string              // Playlist name
├── description?: string
├── image: string             // Playlist cover art URL
├── creator: string           // Curator wallet address
├── genre?: string
├── tags?: string[]
└── tracks: PlaylistTrack[]   // The content
```

### PlaylistTrack

```
PlaylistTrack
│
├── Identity
│   ├── id: string               // e.g. "AR-abc123" or "ethereum-0xContract-1"
│   ├── uuid: string             // Unique instance ID
│   ├── playlist_index: number  // Position in playlist
│   ├── chain_name: string       // "AR", "ethereum", "optimism", etc.
│   ├── token_address?: string  // Contract address (non-AR chains)
│   ├── token_id?: string       // Token ID (non-AR chains)
│   ├── tx_id?: string           // Arweave transaction ID (AR chain only)
│   └── platform: string         // "sound", "catalog", "contract-wizard", etc.
│
├── Content
│   ├── title: string
│   ├── artist: string
│   ├── description?: string
│   └── album?: string
│
├── Assets
│   ├── audio_url: string               // Best audio URL (compressed)
│   ├── audio_url_lossless?: string     // Lossless audio (WAV/FLAC) if available
│   ├── image_url: string               // Best image URL
│   └── image_thumb_url?: string        // Thumbnail if available
│
├── Metadata
│   ├── duration: number        // Seconds
│   ├── genre: string
│   ├── tags: string[]
│   ├── bpm?: number
│   ├── key?: string
│   └── attributes?: Record<string, string | number>
│
└── Extras (extracted during parsing — only present if track has extras)
    ├── extras.hasExtras: boolean
    ├── extras.stems?: StemInfo[]        // Individual instrument tracks
    ├── extras.mixes?: MixInfo[]         // Alternate mixes with conditions
    ├── extras.vrm?: string              // 3D avatar model URL
    ├── extras.lyrics?: { text? }       // Song lyrics
    ├── extras.visualizer?: { mime_type?, uri? }  // Visualizer asset
    ├── extras.video?: { mime_type?, uri? }        // Video asset
    ├── extras.merch?: { mime_type?, type?, uri? }  // Merchandise asset
    ├── extras.credits?: { name, credit }[]         // Credits / acknowledgments
    ├── extras.midi?: string             // MIDI file URL
    ├── extras.step_mania?: string       // StepMania chart URL
    ├── extras.clone_hero?: string       // Clone Hero chart URL
    └── extras.external_url?: string     // External link
```

---

## Getting What You Want

How you access data depends on whether you have a parsed playlist or raw data.

### From a Parsed Playlist

After `parser.parse()`, every track is already flattened. Access fields directly:

```typescript
const playlist = await parser.parse(rawData);
const track = playlist.tracks[0];

track.audio_url            // Best audio URL
track.audio_url_lossless   // Lossless audio if available
track.image_url            // Best image URL
track.image_thumb_url      // Thumbnail
track.title                // "Song Name"
track.artist               // "Artist Name"
track.genre                // "Electronic"
track.tags                 // ["chill", "upbeat"]
track.duration             // 234.5 (seconds)
track.bpm                  // 128
track.id                   // "AR-abc123..."
track.chain_name           // "AR"
track.extras               // { stems, mixes, hasExtras } — see Beyond Standard Fields below
```

### From Raw / Unparsed Data

If you have a raw track object (before parsing) and need to extract a specific field, use `MetadataExtractor` directly. All methods are static — no instantiation needed.

```typescript
import { MetadataExtractor } from 'playlist-data-engine';

const metadata = MetadataExtractor.parseMetadata(rawTrack.metadata);

// Get exactly what you need
MetadataExtractor.extractAudioUrl(metadata);      // Best audio URL
MetadataExtractor.extractAudioUrlLossless(metadata); // Lossless audio
MetadataExtractor.extractImageUrl(metadata);      // Best image URL
MetadataExtractor.extractImageThumbUrl(metadata);  // Thumbnail
MetadataExtractor.extractTitle(metadata);         // Track title
MetadataExtractor.extractArtist(metadata);        // Artist
MetadataExtractor.extractGenre(metadata);         // Genre
```

These methods work across all platforms automatically — no need to know which field names each platform uses.

### From Either Format (Playlist Utilities)

The playlist utility functions accept both parsed and raw playlists. They handle the format detection internally:

```typescript
import {
    getAudioUrls,       // string[] — all audio URLs
    getImageUrls,       // string[] — all image URLs
    getTrackTitles,     // string[] — all titles
    getArtists,         // string[] — all artists
    getGenres,          // string[] — unique genres, sorted
    getTags,            // string[] — unique tags, sorted, lowercased
    getTotalDuration,    // number — total seconds
    getTrackCount,       // number
    getTracks,           // SimpleTrack[] — simplified objects with core fields
    getFullTracks,       // object[] — all available data
    getVRMs,             // string[] — VRM URLs from tracks that have one
    getVRMTracks,        // VRMTrack[] — track data paired with VRM URLs
} from 'playlist-data-engine';

// Works with both parsed and raw playlists
const urls = getAudioUrls(playlist);
const titles = getTrackTitles(rawPlaylist);
```

### Beyond Standard Fields

Standard fields (audio, image, title, artist) are extracted during parsing and attached directly to the track. Extras (stems, alternate mixes) are also extracted during parsing:

```typescript
// Track extras — available on every parsed track (only present if track has extras)
track.extras.hasExtras  // boolean

// Stems and mixes (only present if track has them)
track.extras.stems?.[0].name    // "Drums"
track.extras.mixes?.[0].name    // "Night Mix"

// Media and content (only present if track has them)
track.extras.vrm           // "https://.../avatar.vrm"
track.extras.lyrics?.text  // "Hello world"
track.extras.visualizer?.uri
track.extras.video?.uri
track.extras.merch?.uri
track.extras.credits       // [{ name: "Producer", credit: "Beat production" }]
track.extras.midi
track.extras.step_mania
track.extras.clone_hero
track.extras.external_url
```

> `getTrackExtras()` is still available if you need to extract extras from raw/unparsed metadata directly.

### Raw Metadata Access

For fields not extracted during parsing — external URLs, credits, lyrics, or any platform-specific data — access the full raw metadata:

```typescript
const playlist = await parser.parse(rawData);
const track = playlist.tracks[0];

// Stems and alternate mixes — available right on the track
if (track.extras?.hasExtras) {
    for (const stem of track.extras.stems) {
        console.log(`Stem: ${stem.name} → ${stem.uri}`);
    }
    for (const mix of track.extras.mixes) {
        console.log(`Mix: ${mix.name} — ${mix.conditions.length} conditions`);
    }
}

// For non-standard fields not extracted during parsing (youtube_url, credits, lyrics, etc.)
// use getTrackMetadata() to access the full raw metadata
import { getTrackMetadata } from 'playlist-data-engine';
const metadata = getTrackMetadata(track);
metadata?.youtube_url;
metadata?.credits;
metadata?.lyrics;
```

> `getTrackExtras()` is still available if you need to extract extras from raw/unparsed metadata directly. But for parsed tracks, `track.extras` is the primary path.

---

## PlaylistParser

Converts raw JSON into `ServerlessPlaylist` objects. Each track is flattened with consistent field names regardless of the source format.

```typescript
import { PlaylistParser } from 'playlist-data-engine';

const parser = new PlaylistParser({ resolveImageUrls: true });
const playlist = await parser.parse(rawData);
console.log(`${playlist.tracks.length} tracks loaded`);
```

**Options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `validateAudioUrls` | boolean | `false` | HEAD-check audio URLs during parsing |
| `strict` | boolean | `false` | Throw on invalid tracks instead of skipping |
| `audioUrlValidationTimeout` | number | `5000` | Timeout for audio URL validation (ms) |
| `resolveImageUrls` | boolean | `false` | Resolve Arweave image URLs to working gateways |

For the full API reference, see [DATA_ENGINE_REFERENCE.md — Core Modules](../DATA_ENGINE_REFERENCE.md#core-modules).

---

## MetadataExtractor

Extracts metadata fields from track data. The engine calls these automatically during parsing, but they can also be used directly on arbitrary metadata objects (see [Getting What You Want](#getting-what-you-want)).

| Method | Description |
|--------|-------------|
| `extractAudioUrl()` | Best available audio URL across common platform formats |
| `extractAudioUrlLossless()` | Lossless audio (WAV/FLAC) if present |
| `extractImageUrl()` | Best available image URL — checks flat fields then nested object paths |
| `extractImageThumbUrl()` | Thumbnail URL |
| `extractTitle()` | Track title |
| `extractArtist()` | Artist name |
| `extractGenre()` | Genre — string, array, or OpenSea attributes |
| `parseMetadata()` | Parses stringified JSON to object |
| `convertAttributes()` | Converts OpenSea-style `[{ trait_type, value }]` to `{ key: value }` |

For the full extraction priority chains, see [DATA_ENGINE_REFERENCE.md — MetadataExtractor](../DATA_ENGINE_REFERENCE.md#helper-metadataextractor).

---

## Track Extras (Stems, Mixes, and Conditions)

Tracks can carry additional content beyond the primary audio — individual instrument stems and alternate mixes that activate under specific conditions (weather, time of day, play count, etc.).

### Getting Track Metadata and Extras

```typescript
import { getTrackMetadata, getTrackExtras } from 'playlist-data-engine';

// Get full raw metadata (access any field: youtube_url, credits, lyrics, etc.)
const metadata = getTrackMetadata(track);
if (!metadata) return;

// Get available stems and mixes
const extras = getTrackExtras(metadata);
if (!extras.hasExtras) return;

console.log(`${extras.stems.length} stems, ${extras.mixes.length} mixes`);
for (const stem of extras.stems) {
    console.log(`  Stem: ${stem.name} → ${stem.uri}`);
}
```

### Types

| Type | Description |
|------|-------------|
| `TrackExtrasInfo` | Summary of extras on a track — `hasExtras` plus any populated fields below |
| `StemInfo` | `{ name, uri?, mime_type? }` — an individual instrument track |
| `MixCondition` | `{ type, value }` — a condition on a mix (e.g., weather, time) |
| `MixInfo` | `{ name, uri?, mime_type?, conditions[] }` — an alternate mix |
| `LyricsInfo` | `{ text? }` — song lyrics |
| `MediaAssetInfo` | `{ mime_type?, uri? }` — a media asset (visualizer, video) |
| `MerchInfo` | `{ mime_type?, type?, uri? }` — a merchandise asset |
| `CreditInfo` | `{ name, credit }` — a single credit entry |
| `MixEvaluationResult` | `{ mix, conditions[], allMet, unmetConditions[] }` — evaluation output |
| `AppState` | `{ playCount?, isFavorite?, userBirthday? }` — app-level context |
| `EvaluationContext` | `{ environment?, appState? }` — full evaluation context |

### Evaluating Mix Conditions

Alternate mixes can have conditions that control when they're available. The engine evaluates these against the current environment (from sensors) and app state.

```typescript
import {
    getTrackMetadata,
    getTrackExtras,
    evaluateMixConditions,
} from 'playlist-data-engine';

const metadata = getTrackMetadata(track);
const extras = getTrackExtras(metadata);

const results = evaluateMixConditions(extras, {
    environment: environmentalSensors.getContext(),
    appState: { playCount: 5, isFavorite: true },
});

for (const result of results) {
    if (result.allMet) {
        console.log(`"${result.mix.name}" is available`);
        // Use result.mix.uri to play this mix
    } else {
        console.log(`"${result.mix.name}" blocked:`);
        for (const cond of result.unmetConditions) {
            console.log(`  ${cond.reason}`);
        }
    }
}
```

### Supported Condition Types

| Type | Value Format | Evaluates Against |
|------|-------------|-------------------|
| `weather` | Weather type string (e.g., `"Rain"`, `"Clear"`) | `environment.weather.weatherType` |
| `day` | Day name (e.g., `"Friday"`) | Current day of week |
| `start_time` | `"HH:MM"` format | Current time (met if after value) |
| `end_time` | `"HH:MM"` format | Current time (met if before value) |
| `min_plays` | Integer | `appState.playCount` (met if >= value) |
| `max_plays` | Integer | `appState.playCount` (met if <= value) |
| `every_x_plays` | Integer | `appState.playCount` (met if evenly divisible) |
| `altitude` | Comparison like `">1000"`, `"<=500"` | `environment.geolocation.altitude` |
| `favorite` | `"true"` or `"false"` | `appState.isFavorite` |
| `birthday` | `"MM-DD"` format | Current date matches user birthday |
| `weight` | Number | Not a gate — always passes; used for random selection probability |
| Unknown types | Any | Always passes (flexible/extensible) |

---

## IPFS URL Utilities

The engine can detect and resolve IPFS URLs across multiple formats. Useful when playlists reference content stored on IPFS (e.g., NFT platforms like Sound.xyz, Catalog, Spinamp).

### Supported URL Formats

| Format | Example |
|--------|---------|
| Native scheme (double ipfs) | `ipfs://ipfs/QmXxx/path` |
| Native scheme | `ipfs://QmXxx/path` |
| Gateway URL | `https://ipfs.io/ipfs/QmXxx/path` |
| Subdomain | `https://QmXxx.ipfs.dweb.link/path` |

### Functions

```typescript
import { isIPFS, extractIPFSPath, resolveIPFSLink } from 'playlist-data-engine';

// Detection
isIPFS('https://soundxyz.mypinata.cloud/ipfs/QmXxx/file.jpg'); // true
isIPFS('https://example.com/image.png');                         // false

// Extract CID + path
extractIPFSPath('ipfs://QmXxx/file.jpg');                         // 'QmXxx/file.jpg'
extractIPFSPath('https://QmXxx.ipfs.dweb.link/file.jpg');        // 'QmXxx/file.jpg'

// Resolve to a specific gateway
resolveIPFSLink('ipfs://QmXxx');                                              // 'https://ipfs.io/ipfs/QmXxx'
resolveIPFSLink('https://soundxyz.mypinata.cloud/ipfs/QmXxx', 'dweb.link');  // 'https://dweb.link/ipfs/QmXxx'
```

Non-IPFS URLs pass through `resolveIPFSLink` unchanged.

### Known Gateway Hosts

The `isIPFS` and `extractIPFSPath` functions recognize these gateway hosts (exact match or subdomain):

`ipfs.io`, `cloudflare-ipfs.com`, `dweb.link`, `gateway.pinata.cloud`, `ipfs.infura.io`, `nftstorage.link`, plus platform-specific hosts (Sound.xyz, Catalog, Spinamp, Bonfire, Web3 Music Pipeline).

For the full list, see `KNOWN_IPFS_GATEWAY_HOSTS` in [src/utils/ipfsUtils.ts](../../src/utils/ipfsUtils.ts).

---

## Playlist Utilities

Simple functions that extract arrays of basic data from playlists. Works with both parsed (`ServerlessPlaylist`) and raw (`RawArweavePlaylist`) formats. Each function handles format detection internally and delegates to `MetadataExtractor` for raw tracks.

```typescript
import {
    getAudioUrls,
    getImageUrls,
    getTrackTitles,
    getArtists,
    getGenres,
    getTags,
    getTotalDuration,
    getTrackCount,
    getTracks,
    getFullTracks,
    getVRMs,
    getVRMTracks,
} from 'playlist-data-engine';
```

| Function | Returns | Description |
|----------|---------|-------------|
| `getAudioUrls(playlist)` | `string[]` | All audio URLs from tracks |
| `getImageUrls(playlist)` | `string[]` | All image URLs from tracks |
| `getTrackTitles(playlist)` | `string[]` | All track titles |
| `getArtists(playlist)` | `string[]` | All artist names |
| `getGenres(playlist)` | `string[]` | Unique genres (sorted) |
| `getTags(playlist)` | `string[]` | Unique tags (sorted, lowercased) |
| `getTotalDuration(playlist)` | `number` | Total duration in seconds |
| `getTrackCount(playlist)` | `number` | Number of tracks |
| `getTracks(playlist)` | `SimpleTrack[]` | Simplified objects with core fields |
| `getFullTracks(playlist)` | `object[]` | All available track data |
| `getVRMs(playlist)` | `string[]` | VRM URLs from tracks that have one |
| `getVRMTracks(playlist)` | `VRMTrack[]` | Track data paired with VRM URLs |

For the full API reference, see [DATA_ENGINE_REFERENCE.md — Playlist Utilities](../DATA_ENGINE_REFERENCE.md#playlist-utilities).
