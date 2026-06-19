# Playlist Parsing

## Quick Start

The playlist parsing pipeline takes a raw `ServerlessPlaylist` object (from Arweave, IPFS, or any JSON source) and flattens each track into a consistent shape — stripping redundant fields and normalizing platform-specific names so you only have what you need.

```typescript
import { PlaylistParser } from 'playlist-data-engine';

const parser = new PlaylistParser();
const playlist = await parser.parse(rawData);

console.log(`${playlist.tracks.length} tracks loaded`);
// playlist.name, playlist.image, playlist.creator, ...
```

**Options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `validateAudioUrls` | boolean | `false` | HEAD-check audio URLs during parsing |
| `strict` | boolean | `false` | Throw on invalid tracks instead of skipping |
| `audioUrlValidationTimeout` | number | `5000` | Timeout for audio URL validation (ms) |
| `resolveImageUrls` | boolean | `false` | Resolve Arweave image URLs to working gateways via HEAD-checking the gateway manager. Adds network requests during parsing. Audio URLs are never resolved. |

---

## Accessing Track Data

After parsing, every track is flattened with consistent field names regardless of source platform. Access fields directly:

```typescript
const track = playlist.tracks[0];

track.audio_url            // Best audio URL
track.audio_url_lossless   // Lossless audio if available
track.image_url            // Best image/artwork URL (parser accepts artwork_url OR image_url on input, normalizes to image_url)
track.image_thumb_url      // Thumbnail
track.artist               // "Artist Name"
track.genre                // "Electronic"
track.tags                 // ["chill", "upbeat"]
track.duration             // 234.5 (seconds)
track.bpm                  // 128
track.id                   // "AR-abc123..."
track.chain_name           // "AR"
```

### Track Extras

Extras (stems, mixes, VRMs, lyrics, game charts, etc.) are extracted during parsing and available on every track:

```typescript
track.extras.hasExtras  // boolean

// Stems and mixes (only present if track has them)
track.extras.stems?.[0].name    // "Drums"
track.extras.mixes?.[0].name    // "Night Mix"

// Media and content
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

### Raw Metadata Access

For non-standard fields not extracted during parsing (youtube_url, or any platform-specific data), access the full raw metadata:

```typescript
import { getTrackMetadata } from 'playlist-data-engine';

const metadata = getTrackMetadata(track);
metadata?.youtube_url;
metadata?.credits;
```

> `getTrackMetadata()` reads the `.metadata` property from any track-like object (raw or parsed) and returns the parsed result. For raw tracks where metadata is a stringified JSON blob, it handles the parsing automatically.

---

## Playlist Utilities

Quick functions to extract arrays of data from a playlist. Works with both parsed (`ServerlessPlaylist`) and raw (`RawArweavePlaylist`) formats:

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

const urls = getAudioUrls(playlist);
const genres = getGenres(rawPlaylist);
```

For the full API reference, see [DATA_ENGINE_REFERENCE.md — Playlist Utilities](../DATA_ENGINE_REFERENCE.md#playlist-utilities).

---

## Track Extras (Stems, Mixes, and Conditions)

Tracks can carry additional content beyond the primary audio — individual instrument stems and alternate mixes that activate under specific conditions (weather, time of day, play count, etc.).

### Evaluating Mix Conditions

```typescript
import { evaluateMixConditions } from 'playlist-data-engine';

const results = evaluateMixConditions(track.extras, {
    environment: environmentalSensors.getContext(),
    appState: { playCount: 5, isFavorite: true },
});

for (const result of results) {
    if (result.allMet) {
        console.log(`"${result.mix.name}" is available`);
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

### Extras Types

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

---

## Working with Raw / Unparsed Data

If you have a raw track object (before parsing) and need to extract fields manually, use `MetadataExtractor` directly. All methods are static — no instantiation needed.

```typescript
import { MetadataExtractor } from 'playlist-data-engine';

const metadata = MetadataExtractor.parseMetadata(rawTrack.metadata);

MetadataExtractor.extractAudioUrl(metadata);      // Best audio URL
MetadataExtractor.extractAudioUrlLossless(metadata); // Lossless audio
MetadataExtractor.extractImageUrl(metadata);      // Best image URL
MetadataExtractor.extractImageThumbUrl(metadata);  // Thumbnail
MetadataExtractor.extractTitle(metadata);         // Track title
MetadataExtractor.extractArtist(metadata);        // Artist
MetadataExtractor.extractGenre(metadata);         // Genre
```

For getting extras from raw tracks (without going through `PlaylistParser`):

```typescript
import { getTrackMetadata, getTrackExtras } from 'playlist-data-engine';

const metadata = getTrackMetadata(rawTrack);
if (!metadata) return;

const extras = getTrackExtras(metadata);
if (!extras.hasExtras) return;

console.log(`${extras.stems.length} stems, ${extras.mixes.length} mixes`);
```

---

## Reference

### Source Files

| Component | Location |
|-----------|----------|
| PlaylistParser | [src/core/parser/PlaylistParser.ts](../../src/core/parser/PlaylistParser.ts) |
| MetadataExtractor | [src/core/parser/MetadataExtractor.ts](../../src/core/parser/MetadataExtractor.ts) |
| Track Extras | [src/core/parser/TrackExtras.ts](../../src/core/parser/TrackExtras.ts) |
| Playlist Utilities | [src/utils/playlistUtils.ts](../../src/utils/playlistUtils.ts) |
| Type Definitions | [src/core/types/Playlist.ts](../../src/core/types/Playlist.ts) |

### ServerlessPlaylist

```
ServerlessPlaylist
├── name: string              // Playlist name
├── description?: string
├── image: string             // Playlist cover art URL
├── creator: string           // Curator wallet address
├── genre?: string
├── tags?: string[]
├── playlist_type?: 'new' | 'remix' | 'ep' | 'lp' | 'single'   // v0.4
├── original_playlist_tx_id?: string                            // v0.4 (remixes)
├── playlist_artist?: string                                    // v0.4 (ep/lp/single)
├── platform?: string                                           // v0.4 (directory-imported origin: "contract-wizard" | "nina")
└── tracks: PlaylistTrack[]   // The content
```

> **v0.4 naming convention:** Fields that travel on the wire (playlist body, track wrapper,
> metadata interior, Arweave tags) use snake_case for JSON body fields and Pascal-Kebab for
> Arweave tags. Mint metadata (`mint_function`, `mint_price`, `mint_snapshot_time`, `mint_token`)
> lives **only inside the stringified `metadata` interior** — it is never promoted onto the track
> wrapper and never emitted as an Arweave tag. Use `getTrackMetadata()` to read those values.
>
> **Image field aliasing:** The ApeTapes app writes `artwork_url` onto track wrappers when uploading
> playlists. The engine's parser accepts **either** `artwork_url` **or** `image_url` on input and
> normalizes the value to the engine's canonical output field `image_url` (which pairs with
> `image_thumb_url`). So input may carry `artwork_url`, but the parsed `PlaylistTrack` always
> exposes the resolved image as `image_url`.

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
│   ├── image_thumb_url?: string        // Thumbnail if available
│   ├── audio_ipfs_hash?: string        // IPFS CID of the audio file (v0.4)
│   └── artwork_ipfs_hash?: string      // IPFS CID of the artwork/image file (v0.4)
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

### MetadataExtractor Methods

Extracts metadata fields from track data. Called automatically during parsing, but can also be used directly on arbitrary metadata objects.

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

For the full API reference, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md).
