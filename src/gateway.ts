/**
 * @file TF-free gateway entry point.
 *
 * Re-exports only the Arweave gateway manager, Arweave/IPFS URL utilities, and
 * their types. Deliberately does NOT re-export anything from `core/analysis/`
 * (MusicClassifier, EssentiaPitchDetector) or `utils/modelCache.ts`, so that
 * consumers importing from `playlist-data-engine/gateway` do not pull
 * `@tensorflow/tfjs` into their bundle.
 *
 * The full library (including TF-dependent audio analysis) remains available
 * from the main entry: `playlist-data-engine`.
 */

// Arweave URL utilities (pure functions, zero external deps)
export {
    type GatewayConfig,
    type ArweaveUrlInfo,
    DEFAULT_GATEWAYS,
    KNOWN_GATEWAY_HOSTS,
    isArweaveUrl,
    parseArweaveUrl,
    constructGatewayUrl,
    getAllGatewayUrls,
} from './utils/arweaveUtils.js';

// Arweave Gateway Manager (uses @ar.io/wayfinder-core + @ar.io/sdk, NOT TF)
export {
    ArweaveGatewayManager,
    arweaveGatewayManager,
    type GatewayCache,
    type GatewayCheckResult,
    type ResolveUrlOptions,
    type ArweaveGatewayManagerConfig,
    type PrefetchOptions,
    type PrefetchResultEntry,
    type PrefetchResult,
    type CacheStats,
    type GatewayHealthStats,
    type HealthCheckResult,
    type HealthCheckOptions,
    type GatewayDiagnostics,
} from './utils/arweaveGatewayManager.js';

// IPFS URL utilities (pure functions, zero external deps)
export {
    KNOWN_IPFS_GATEWAY_HOSTS,
    DEFAULT_IPFS_GATEWAY,
    extractIPFSPath,
    isIPFS,
    resolveIPFSLink,
    type ResolveIPFSOptions,
} from './utils/ipfsUtils.js';

// Metadata extraction (static utility class, zero imports — TF-free).
// Lives in this TF-free entry so upload/playlist flows that only need metadata
// parsing don't drag in the audio-analysis (MusicClassifier) TF dependency.
export { MetadataExtractor } from './core/parser/MetadataExtractor.js';

// Playlist extraction utilities (pure functions over parsed/raw playlists —
// only dependency is MetadataExtractor above, TF-free).
export {
    getVRMs,
    getVRMTracks,
    getMixes,
    getMixTracks,
    type PlaylistInput,
    type SimpleTrack,
    type VRMTrack,
    type MixTrackInfo,
} from './utils/playlistUtils.js';

// Mix lookup & resolution (TrackExtras + gateway manager above, TF-free).
export {
    findMixByName,
    resolveMixUrl,
    selectMix,
    type MixInfo,
    type SelectedMixInfo,
    type FindMixByNameOptions,
    type ResolveMixUrlOptions,
    type SelectMixOptions,
} from './core/parser/TrackExtras.js';

export type {
    ServerlessPlaylist,
    RawArweavePlaylist,
    PlaylistTrack,
} from './core/types/Playlist.js';

// Self-describing docs index (inlined at build time — TF-free, browser-safe)
export {
    engineHelp,
    ENGINE_DOC_TOPICS,
    ENGINE_DOC_ARCHIVE,
    type EngineDocTopic,
    type EngineDocArchiveEntry
} from './utils/engineDocs.js';
