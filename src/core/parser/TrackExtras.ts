/**
 * Track extras extraction — stems, alternate mixes, and condition evaluation.
 *
 * These functions operate on parsed metadata objects (the output of
 * MetadataExtractor.parseMetadata). They provide:
 *
 * - getTrackMetadata: Full raw parsed metadata passthrough
 * - getTrackExtras: Summary of available stems, mixes, and their conditions
 * - resolveSelectedMix: Which of a track's mixes a playlist entry pinned
 * - findMixByName / getPreferredMixByQuality / getUniqueMixes: Mix lookup & grouping
 * - resolveMixUrl / selectMix: Turn a chosen mix into a playable track
 * - evaluateMixConditions: Evaluate mix conditions against sensor context
 *
 * @module core/parser/TrackExtras
 */

import type { EnvironmentalContext } from '../types/Environmental.js';
import type { PlaylistTrack } from '../types/Playlist.js';
import { MetadataExtractor } from './MetadataExtractor.js';
import { arweaveGatewayManager } from '../../utils/arweaveGatewayManager.js';

// ─── Types ──────────────────────────────────────────────────────────────

/** A single stem from the metadata */
export interface StemInfo {
    name: string;
    uri?: string;
    mime_type?: string;
}

/** A condition on a mix (e.g., weather, time, plays) */
export interface MixCondition {
    type: string;
    value: string;
}

/** An alternate mix from the metadata */
export interface MixInfo {
    name: string;
    uri?: string;
    mime_type?: string;
    conditions: MixCondition[];
}

/** The mix a playlist entry pinned, resolved against the track's own mixes */
export interface SelectedMixInfo {
    /** The chosen mix name, as written on the entry */
    name: string;
    /** Compressed/preferred version of the chosen mix */
    audio_url?: string;
    /** Lossless version, when the track ships one under the same name */
    audio_url_lossless?: string;
}

/** Summary of extras available on a track */
export interface TrackExtrasInfo {
    /** Whether the track has any extras at all */
    hasExtras: boolean;
    /** Available stems (individual instrument tracks) */
    stems?: StemInfo[];
    /** Available alternate mixes with conditions */
    mixes?: MixInfo[];
    /** 3D avatar model URL */
    vrm?: string;
    /** Song lyrics */
    lyrics?: LyricsInfo;
    /** Visualizer asset (e.g., music video or reactive visual) */
    visualizer?: MediaAssetInfo;
    /** Video asset */
    video?: MediaAssetInfo;
    /** Merchandise asset */
    merch?: MerchInfo;
    /** Credits / acknowledgments */
    credits?: CreditInfo[];
    /** MIDI file URL */
    midi?: string;
    /** StepMania chart URL */
    step_mania?: string;
    /** Clone Hero chart URL */
    clone_hero?: string;
    /** External link (e.g., artist website, platform page) */
    external_url?: string;
}

/** Song lyrics */
export interface LyricsInfo {
    text?: string;
}

/** A media asset with mime type and URI */
export interface MediaAssetInfo {
    mime_type?: string;
    uri?: string;
}

/** A merchandise asset */
export interface MerchInfo extends MediaAssetInfo {
    type?: string;
}

/** A single credit entry */
export interface CreditInfo {
    name: string;
    credit: string;
}

/** Result of evaluating a single condition */
export interface ConditionEvaluationResult {
    /** The condition type */
    type: string;
    /** The condition value */
    value: string;
    /** Whether the condition is currently met */
    met: boolean;
    /** Human-readable reason (e.g., "Weather is Rain", "Time is after 22:00") */
    reason: string;
}

/** Result of evaluating all conditions on a single mix */
export interface MixEvaluationResult {
    /** The mix being evaluated */
    mix: MixInfo;
    /** Individual condition evaluations */
    conditions: ConditionEvaluationResult[];
    /** Whether ALL conditions are met */
    allMet: boolean;
    /** Which conditions are not met (empty if allMet) */
    unmetConditions: ConditionEvaluationResult[];
}

/** App-level state that conditions can check (not from sensors) */
export interface AppState {
    /** How many times the current track has been played */
    playCount?: number;
    /** Whether the user has favorited the current track */
    isFavorite?: boolean;
    /** User's birthday in MM-DD format (e.g., "06-15") */
    userBirthday?: string;
}

/** Full context for evaluating mix conditions */
export interface EvaluationContext {
    /** Environmental sensor data (geolocation, weather, motion, time) */
    environment?: EnvironmentalContext;
    /** App-level state (play count, favorites, birthday) */
    appState?: AppState;
}

// ─── getTrackMetadata ─────────────────────────────────────────────────

/**
 * Extract the full raw parsed metadata object for a track.
 *
 * Unlike getFullTracks() which picks specific fields, this returns
 * the entire metadata object so consumers can access any field
 * (external_url, youtube_url, credits, lyrics, etc.).
 *
 * @param track - A playlist track (raw or parsed)
 * @returns The full parsed metadata object, or null if unavailable
 *
 * @example
 * ```ts
 * const metadata = getTrackMetadata(track);
 * if (metadata) {
 *   console.log(metadata.youtube_url);
 *   console.log(metadata.credits);
 *   console.log(metadata.external_url);
 * }
 * ```
 */
export function getTrackMetadata(
    track: { metadata?: string | Record<string, unknown> } | null | undefined
): Record<string, unknown> | null {
    if (!track || !track.metadata) return null;

    if (typeof track.metadata === 'string') {
        try {
            const parsed = JSON.parse(track.metadata);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }
            return null;
        } catch {
            return null;
        }
    }

    if (typeof track.metadata === 'object' && !Array.isArray(track.metadata)) {
        return track.metadata as Record<string, unknown>;
    }

    return null;
}

// ─── getTrackExtras ───────────────────────────────────────────────────

/**
 * Extract a summary of extras available on a track.
 *
 * Reads from the raw metadata object and returns structured info about
 * what additional content is available beyond the primary audio/image.
 *
 * @param metadata - Parsed metadata object (from getTrackMetadata or parseMetadata)
 * @returns Summary of available stems, mixes, media assets, and other extras
 */
export function getTrackExtras(metadata: Record<string, unknown> | null): TrackExtrasInfo {
    const empty: TrackExtrasInfo = { stems: [], mixes: [], hasExtras: false };
    if (!metadata) return empty;

    const stems = extractStems(metadata);
    const mixes = extractMixes(metadata);
    const vrm = typeof metadata.vrm === 'string' ? metadata.vrm : undefined;
    const lyrics = extractLyrics(metadata.lyrics);
    const visualizer = extractMediaAsset(metadata.visualizer);
    const video = extractMediaAsset(metadata.video);
    const merch = extractMerch(metadata.merch);
    const credits = extractCredits(metadata.credits);
    const midi = typeof metadata.midi === 'string' ? metadata.midi : undefined;
    const step_mania = typeof metadata.step_mania === 'string' ? metadata.step_mania : undefined;
    const clone_hero = typeof metadata.clone_hero === 'string' ? metadata.clone_hero : undefined;
    const external_url = typeof metadata.external_url === 'string' ? metadata.external_url : undefined;

    const hasExtras =
        stems.length > 0 || mixes.length > 0 ||
        !!vrm || !!lyrics || !!visualizer || !!video || !!merch || !!credits ||
        !!midi || !!step_mania || !!clone_hero || !!external_url;

    return {
        hasExtras,
        ...(stems.length > 0 ? { stems } : {}),
        ...(mixes.length > 0 ? { mixes } : {}),
        ...(vrm ? { vrm } : {}),
        ...(lyrics ? { lyrics } : {}),
        ...(visualizer ? { visualizer } : {}),
        ...(video ? { video } : {}),
        ...(merch ? { merch } : {}),
        ...(credits ? { credits } : {}),
        ...(midi ? { midi } : {}),
        ...(step_mania ? { step_mania } : {}),
        ...(clone_hero ? { clone_hero } : {}),
        ...(external_url ? { external_url } : {}),
    };
}

/** Mime types treated as lossless when several mixes share one name. */
const LOSSLESS_MIME_TYPES = ['audio/wav', 'audio/x-wav', 'audio/flac'];

/**
 * Resolve which of a track's mixes a playlist entry plays.
 *
 * Reads the wrapper's `selected_mix`, falling back to the `Selected Mix`
 * attribute for older playlists. One name can cover a lossless and a lossy
 * master, so both URLs come back.
 *
 * @param wrapperMix - `selected_mix` from the raw track wrapper
 * @param attributes - Converted metadata attributes, for older playlists
 * @param mixes - The track's own mixes, from getTrackExtras
 * @returns The selection, or null if nothing was pinned, the legacy "default"
 *          placeholder was, or the name matches no mix on the track
 */
export function resolveSelectedMix(
    wrapperMix: unknown,
    attributes: Record<string, string | number> | null | undefined,
    mixes: MixInfo[] | undefined
): SelectedMixInfo | null {
    const attributeMix = attributes?.['Selected Mix'];
    const declared = (typeof wrapperMix === 'string' && wrapperMix)
        || (typeof attributeMix === 'string' && attributeMix)
        || null;

    if (!declared || declared === 'default') return null;

    const named = (mixes ?? []).filter(mix => mix.name === declared);
    if (named.length === 0) return null;

    const isLossless = (mix: MixInfo): boolean =>
        LOSSLESS_MIME_TYPES.includes((mix.mime_type ?? '').toLowerCase());

    const lossless = named.find(isLossless);
    const preferred = named.find(mix => !isLossless(mix)) ?? named[0];

    return {
        name: declared,
        ...(preferred?.uri ? { audio_url: preferred.uri } : {}),
        ...(lossless?.uri && lossless.uri !== preferred?.uri
            ? { audio_url_lossless: lossless.uri }
            : {}),
    };
}

// ─── Mix lookup & grouping ───────────────────────────────────────────

/** Options for findMixByName */
export interface FindMixByNameOptions {
    /** Match names ignoring case and surrounding whitespace (default: true) */
    caseInsensitive?: boolean;
    /** Which master to prefer when several mixes share the name (default: 'lossy', matching the pin flow) */
    prefer?: 'lossy' | 'lossless';
    /**
     * Also match alias spellings and concept names — 'inst' finds 'Instrumental',
     * 'aca' finds 'Acapella', 'vox' finds 'Vocals Only'. Exact names always win.
     * Only applies in case-insensitive mode (default: true)
     */
    aliases?: boolean;
}

/**
 * Find a track's mix by name.
 *
 * Unlike the playlist entry's pin (resolveSelectedMix), which matches names
 * exactly and case-sensitively, this is the tolerant lookup for user-facing
 * choice. Three passes, strictest first: the name as written (modulo case and
 * whitespace), then alias spellings — 'inst' and 'no vocals' find
 * 'Instrumental'; 'aca', 'acap' and 'vox' find 'Acapella'; 'tvmix' and
 * 'tv mix' find 'Karaoke', which is its own concept, never an instrumental —
 * matched as whole words so 'Industrial' never matches 'instrumental'.
 * When several mixes match (a lossy and a lossless master), the quality
 * preference decides.
 *
 * @param mixes - The track's mixes, from getTrackExtras
 * @param name - The mix name to find
 * @param options - Matching and quality-preference options
 * @returns The mix, or null when no mix matches
 *
 * @example
 * ```ts
 * const extras = getTrackExtras(metadata);
 * const instrumental = findMixByName(extras.mixes, 'instrumental');
 * const strict = findMixByName(extras.mixes, 'Instrumental', { aliases: false });
 * ```
 */
export function findMixByName(
    mixes: MixInfo[] | null | undefined,
    name: string,
    options?: FindMixByNameOptions
): MixInfo | null {
    if (!mixes || !name) return null;
    const matched = matchMixes(mixes, name, options?.caseInsensitive !== false, options?.aliases !== false);
    return matched.length > 0 ? getPreferredMixByQuality(matched, options?.prefer ?? 'lossy') : null;
}

/**
 * Pick the preferred master among mixes that share one name.
 *
 * A mix name can ship twice — once lossy (mp3) and once lossless (wav/flac).
 * `prefer: 'lossy'` picks the compressed master (the parser's own behavior
 * when resolving a pin), `'lossless'` the high-fidelity one. Mixes without a
 * recognized mime type only win as the last-resort fallback.
 *
 * @param namedMixes - Mixes sharing one name
 * @param prefer - Which quality to prefer (default: 'lossy')
 * @returns The preferred mix, or null when the list is empty
 */
export function getPreferredMixByQuality(
    namedMixes: MixInfo[] | null | undefined,
    prefer: 'lossy' | 'lossless' = 'lossy'
): MixInfo | null {
    if (!namedMixes || namedMixes.length === 0) return null;
    if (namedMixes.length === 1) return namedMixes[0];

    const preferredTypes = prefer === 'lossy'
        ? ['audio/mpeg', 'audio/wav', 'audio/flac']
        : ['audio/wav', 'audio/flac', 'audio/mpeg'];

    for (const type of preferredTypes) {
        const match = namedMixes.find(mix => canonicalMime(mix.mime_type) === type);
        if (match) return match;
    }

    return namedMixes[0];
}

/** Mixes grouped under one name (e.g. a lossy + lossless pair) */
export interface MixGroup {
    /** The shared name, in the casing the metadata declares it */
    name: string;
    /** Every mix under this name; the first entry is the display pick */
    mixes: MixInfo[];
}

/**
 * Group a track's mixes by name, collapsing lossy/lossless pairs.
 *
 * The grouping key ignores case and surrounding whitespace, so 'Instrumental'
 * and 'instrumental ' land in one group; the group's name keeps the casing of
 * its first member.
 *
 * @param mixes - The track's mixes, from getTrackExtras
 * @returns One group per distinct mix name, in first-appearance order
 *
 * @example
 * ```ts
 * for (const group of getUniqueMixes(extras.mixes)) {
 *   console.log(`${group.name} (${group.mixes.length} masters)`);
 * }
 * ```
 */
export function getUniqueMixes(mixes: MixInfo[] | null | undefined): MixGroup[] {
    if (!mixes || !Array.isArray(mixes)) return [];

    const groups = new Map<string, MixInfo[]>();
    for (const mix of mixes) {
        const key = mix.name.trim().toLowerCase();
        const group = groups.get(key);
        if (group) {
            group.push(mix);
        } else {
            groups.set(key, [mix]);
        }
    }

    return Array.from(groups.values()).map(groupMixes => ({
        name: groupMixes[0].name,
        mixes: groupMixes,
    }));
}

// ─── Mix URL resolution & selection ──────────────────────────────────

/** Options for resolveMixUrl */
export interface ResolveMixUrlOptions {
    /** Gateway-resolve the final URL through arweaveGatewayManager (default: true) */
    resolveUrl?: boolean;
    /** Follow a mix whose uri points at a metadata JSON file rather than audio (default: true) */
    followMetadata?: boolean;
    /** Timeout for the metadata fetch, in milliseconds (default: 10000) */
    fetchTimeoutMs?: number;
}

/**
 * Resolve a mix to a playable audio URL.
 *
 * The parser returns mix uris as written in the metadata — it never resolves
 * them — so this is the last mile before playback. Mix uris come in three
 * shapes, all handled: direct Arweave/IPFS identifiers and URLs (gateway-
 * resolved), and the standard's metadata-JSON indirection, where a mix's uri
 * points at a metadata file whose audio fields name the actual song (followed
 * one level, per the 721J "Alt Outro" example).
 *
 * @param mix - A mix from getTrackExtras, or a selection from resolveSelectedMix
 * @param options - Resolution options
 * @returns The playable URL, or null when the mix has no uri or resolution failed
 *
 * @example
 * ```ts
 * const url = await resolveMixUrl(findMixByName(extras.mixes, 'Instrumental'));
 * ```
 */
export async function resolveMixUrl(
    mix: MixInfo | SelectedMixInfo | null | undefined,
    options?: ResolveMixUrlOptions
): Promise<string | null> {
    if (!mix) return null;

    const candidate = mix as MixInfo & SelectedMixInfo;
    const direct = candidate.uri ?? candidate.audio_url ?? candidate.audio_url_lossless;
    if (!direct) return null;

    let target = direct;

    if (options?.followMetadata !== false && isMetadataUri(mix, direct)) {
        target = await fetchMetadataAudioUrl(direct, options?.fetchTimeoutMs);
        if (!target) return null;
    }

    if (options?.resolveUrl === false) return target;

    try {
        return await arweaveGatewayManager.resolveUrl(target);
    } catch {
        return null;
    }
}

/** Options for selectMix */
export interface SelectMixOptions {
    /** Which master to prefer when several mixes share the name (default: 'lossy', matching the pin flow) */
    prefer?: 'lossy' | 'lossless';
    /** Also match alias spellings — 'inst' finds 'Instrumental' (default: true) */
    aliases?: boolean;
    /** Gateway-resolve the resulting audio URLs (default: true) */
    resolveUrl?: boolean;
    /** Follow metadata-JSON mix uris to the song file (default: true) */
    followMetadata?: boolean;
    /** When provided, the chosen mix must currently satisfy its conditions */
    conditionsContext?: EvaluationContext;
}

/**
 * Choose which of a track's mixes plays, returning a play-ready track.
 *
 * The consumer-side twin of the playlist entry's pin: the parser repoints a
 * pinned track's audio URLs at the pinned mix at parse time, and this does
 * the same for a user's choice. The input track is never mutated. Name
 * matching is tolerant (case-insensitive, trimmed, aliased — 'inst' finds
 * 'Instrumental'); conditions, when a
 * context is given, must currently pass.
 *
 * @param track - A parsed playlist track (with extras from the parser)
 * @param mixName - The mix to play (e.g. 'Instrumental')
 * @param options - Quality preference, resolution, and condition gating
 * @returns A copy of the track with audio URLs swapped to the mix, or null
 *          when the track has no such mix or it is unavailable
 *
 * @example
 * ```ts
 * const playlist = await new PlaylistParser().parse(raw);
 * const track = playlist.tracks[0];
 * const instrumental = await selectMix(track, 'Instrumental', { prefer: 'lossless' });
 * if (instrumental) audio.src = instrumental.audio_url;
 * ```
 */
export async function selectMix(
    track: PlaylistTrack,
    mixName: string,
    options?: SelectMixOptions
): Promise<PlaylistTrack | null> {
    const mixes = track.extras?.mixes;
    if (!mixes || mixes.length === 0 || !mixName) return null;

    let named = matchMixes(mixes, mixName, true, options?.aliases !== false);
    if (named.length === 0) return null;

    if (options?.conditionsContext) {
        const evaluations = evaluateMixConditions(
            { hasExtras: track.extras?.hasExtras ?? true, mixes },
            options.conditionsContext
        );
        const available = new Set(evaluations.filter(e => e.allMet).map(e => e.mix.name));
        named = named.filter(mix => available.has(mix.name));
        if (named.length === 0) return null;
    }

    const preferred = getPreferredMixByQuality(named, options?.prefer ?? 'lossy');
    if (!preferred || !preferred.uri) return null;

    const resolveOptions: ResolveMixUrlOptions = {
        resolveUrl: options?.resolveUrl,
        followMetadata: options?.followMetadata,
    };
    const audio_url = await resolveMixUrl(preferred, resolveOptions);
    if (!audio_url) return null;

    const lossless = named.find(isLosslessMix);
    const audio_url_lossless = lossless && lossless !== preferred && lossless.uri
        ? await resolveMixUrl(lossless, resolveOptions)
        : undefined;

    return {
        ...track,
        audio_url,
        audio_url_lossless: audio_url_lossless && audio_url_lossless !== audio_url
            ? audio_url_lossless
            : undefined,
        selected_mix: preferred.name,
    };
}

/** Mime types whose payload is a metadata JSON document, not audio */
const METADATA_MIME_TYPES = ['application/json', 'application/ld+json'];

/** Mime aliases folded to their canonical form before quality comparisons */
const MIME_ALIASES: Record<string, string> = {
    'audio/x-wav': 'audio/wav',
    'audio/wave': 'audio/wav',
    'audio/vnd.wave': 'audio/wav',
    'audio/x-flac': 'audio/flac',
    'audio/mp3': 'audio/mpeg',
    'audio/mpeg3': 'audio/mpeg',
};

function canonicalMime(mime: string | undefined): string {
    const lower = (mime ?? '').trim().toLowerCase();
    return MIME_ALIASES[lower] ?? lower;
}

function isLosslessMix(mix: MixInfo): boolean {
    return LOSSLESS_MIME_TYPES.includes(canonicalMime(mix.mime_type));
}

function findNamedMixes(
    mixes: MixInfo[] | null | undefined,
    name: string,
    caseInsensitive: boolean
): MixInfo[] {
    if (!mixes || !name) return [];
    const normalize = (value: string): string =>
        caseInsensitive ? value.trim().toLowerCase() : value.trim();
    const target = normalize(name);
    return mixes.filter(mix => normalize(mix.name) === target);
}

// ─── Mix name aliases ────────────────────────────────────────────────

/**
 * Phrases rewritten before token aliasing, rescuing meanings the bare tokens
 * would flip ('no vocals' means instrumental, not acapella).
 */
const MIX_NAME_PHRASES: ReadonlyArray<readonly [from: string, to: string]> = [
    ['no vocals', 'instrumental'],
    ['vocals only', 'acapella'],
    ['vocal only', 'acapella'],
    ['a cappella', 'acapella'],
    ['tv mix', 'karaoke'],
    ['tv version', 'karaoke'],
    ['karaoke version', 'karaoke'],
    ['karaoke mix', 'karaoke'],
];

/** Spelling variants mapped onto their canonical concept token */
const MIX_NAME_ALIASES: Readonly<Record<string, string>> = {
    inst: 'instrumental',
    instr: 'instrumental',
    instrument: 'instrumental',
    instrumentals: 'instrumental',
    aca: 'acapella',
    acap: 'acapella',
    acappella: 'acapella',
    cappella: 'acapella',
    vox: 'acapella',
    vocal: 'acapella',
    vocals: 'acapella',
    rmx: 'remix',
    tvmix: 'karaoke',
    tv: 'karaoke',
    karoake: 'karaoke',
};

/** Reduce a mix name to its concept tokens: canonical concepts + leftover words */
function mixNameSignature(name: string): string[] {
    let normalized = ' ' + name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    for (const [from, to] of MIX_NAME_PHRASES) {
        normalized = normalized.split(' ' + from + ' ').join(' ' + to + ' ');
    }
    return normalized.trim().split(' ').filter(Boolean).map(token => MIX_NAME_ALIASES[token] ?? token);
}

/**
 * Find the mixes a name refers to: exact (modulo case/whitespace) first,
 * then — in tolerant mode only — whole-word alias matching where every word
 * of the query appears in the mix name, aliased to its canonical concept.
 */
function matchMixes(mixes: MixInfo[], name: string, caseInsensitive: boolean, useAliases: boolean): MixInfo[] {
    const named = findNamedMixes(mixes, name, caseInsensitive);
    if (named.length > 0 || !useAliases || !caseInsensitive) return named;

    const queryTokens = mixNameSignature(name);
    if (queryTokens.length === 0) return [];
    return mixes.filter(mix => {
        const tokens = mixNameSignature(mix.name);
        return queryTokens.every(token => tokens.includes(token));
    });
}

function isMetadataUri(mix: MixInfo | SelectedMixInfo, uri: string): boolean {
    const mime = ('mime_type' in mix ? mix.mime_type : '') ?? '';
    if (METADATA_MIME_TYPES.includes(mime.toLowerCase())) return true;
    if (mime) return false;
    return uri.split(/[?#]/)[0].toLowerCase().endsWith('.json');
}

/** Follow one level of metadata-JSON indirection to the audio url it names */
async function fetchMetadataAudioUrl(url: string, timeoutMs = 10000): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        const parsed = MetadataExtractor.parseMetadata(await response.text());
        if (!parsed) return null;
        return MetadataExtractor.extractAudioUrl(parsed);
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

function extractLyrics(raw: unknown): LyricsInfo | undefined {
    if (!raw) return undefined;
    if (typeof raw === 'string') return { text: raw };
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        return { text: typeof obj.text === 'string' ? obj.text : undefined };
    }
    return undefined;
}

function extractMediaAsset(raw: unknown): MediaAssetInfo | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.uri === 'string') {
        return {
            uri: obj.uri,
            mime_type: typeof obj.mime_type === 'string' ? obj.mime_type : undefined,
        };
    }
    return undefined;
}

function extractMerch(raw: unknown): MerchInfo | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.uri === 'string') {
        return {
            uri: obj.uri,
            mime_type: typeof obj.mime_type === 'string' ? obj.mime_type : undefined,
            type: typeof obj.type === 'string' ? obj.type : undefined,
        };
    }
    return undefined;
}

function extractCredits(raw: unknown): CreditInfo[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const credits: CreditInfo[] = [];
    for (const entry of raw) {
        if (entry && typeof entry === 'object') {
            const c = entry as Record<string, unknown>;
            if (typeof c.name === 'string' && typeof c.credit === 'string') {
                credits.push({ name: c.name, credit: c.credit });
            }
        }
    }
    return credits.length > 0 ? credits : undefined;
}

function extractStems(metadata: Record<string, unknown>): StemInfo[] {
    const raw = metadata.stems;
    if (!Array.isArray(raw)) return [];

    const stems: StemInfo[] = [];
    for (const stem of raw) {
        if (stem && typeof stem === 'object') {
            const s = stem as Record<string, unknown>;
            stems.push({
                name: typeof s.name === 'string' ? s.name : '',
                uri: typeof s.uri === 'string' ? s.uri : undefined,
                mime_type: typeof s.mime_type === 'string' ? s.mime_type : undefined,
            });
        }
    }
    return stems;
}

function extractMixes(metadata: Record<string, unknown>): MixInfo[] {
    const raw = metadata.mixes;
    if (!Array.isArray(raw)) return [];

    const mixes: MixInfo[] = [];
    for (const mix of raw) {
        if (mix && typeof mix === 'object') {
            const m = mix as Record<string, unknown>;
            const name = resolveMixName(m.name);
            const conditions = extractConditions(m.conditions);

            mixes.push({
                name: name || '',
                uri: typeof m.uri === 'string' ? m.uri : undefined,
                mime_type: typeof m.mime_type === 'string' ? m.mime_type : undefined,
                conditions,
            });
        }
    }
    return mixes;
}

/** Handle mix names that might be objects with a `value` property */
function resolveMixName(name: unknown): string {
    if (typeof name === 'string') return name;
    if (name && typeof name === 'object' && !Array.isArray(name)) {
        const obj = name as Record<string, unknown>;
        if (typeof obj.value === 'string') return obj.value;
    }
    return '';
}

function extractConditions(raw: unknown): MixCondition[] {
    if (!Array.isArray(raw)) return [];

    const conditions: MixCondition[] = [];
    for (const cond of raw) {
        if (cond && typeof cond === 'object') {
            const c = cond as Record<string, unknown>;
            // Numbers and booleans are coerced rather than dropped — a mix
            // authored with { type: 'min_plays', value: 10 } would otherwise
            // parse to an empty conditions array and evaluate as always-available.
            if (typeof c.type === 'string'
                && (typeof c.value === 'string' || typeof c.value === 'number' || typeof c.value === 'boolean')) {
                conditions.push({ type: c.type, value: String(c.value) });
            }
        }
    }
    return conditions;
}

// ─── evaluateMixConditions ───────────────────────────────────────────

/**
 * Evaluate all mixes' conditions against the current context.
 *
 * Takes the mix data (from getTrackExtras) and the current
 * EnvironmentalContext + app state, and returns which mixes
 * are currently available and why.
 *
 * @param extras - Track extras from getTrackExtras
 * @param context - Environmental sensor data + app state
 * @returns Evaluation results for each mix with conditions
 *
 * @example
 * ```ts
 * const extras = getTrackExtras(metadata);
 * const sensors = new EnvironmentalSensors();
 * const context: EvaluationContext = {
 *   environment: await sensors.updateSnapshot(),
 *   appState: { playCount: 5, isFavorite: true },
 * };
 * const results = evaluateMixConditions(extras, context);
 * for (const result of results) {
 *   if (result.allMet) {
 *     console.log(`"${result.mix.name}" is available: ${result.conditions.map(c => c.reason).join(', ')}`);
 *   }
 * }
 * ```
 */
export function evaluateMixConditions(
    extras: TrackExtrasInfo,
    context?: EvaluationContext
): MixEvaluationResult[] {
    const results: MixEvaluationResult[] = [];
    const now = new Date();

    for (const mix of extras.mixes || []) {
        if (mix.conditions.length === 0) {
            // No conditions — always available
            results.push({
                mix,
                conditions: [],
                allMet: true,
                unmetConditions: [],
            });
            continue;
        }

        const conditionResults: ConditionEvaluationResult[] = [];
        const unmet: ConditionEvaluationResult[] = [];

        for (const condition of mix.conditions) {
            const result = evaluateCondition(condition, context, now);
            conditionResults.push(result);
            if (!result.met) unmet.push(result);
        }

        results.push({
            mix,
            conditions: conditionResults,
            allMet: unmet.length === 0,
            unmetConditions: unmet,
        });
    }

    return results;
}

/**
 * Evaluate a single condition against the current context.
 */
function evaluateCondition(
    condition: MixCondition,
    context?: EvaluationContext,
    now: Date = new Date()
): ConditionEvaluationResult {
    const { type, value } = condition;
    const env = context?.environment;
    const app = context?.appState;

    switch (type) {
        case 'weather': {
            const currentWeather = env?.weather?.weatherType || '';
            const met = currentWeather.toLowerCase() === value.toLowerCase();
            return {
                type, value, met,
                reason: met
                    ? `Weather is ${currentWeather}`
                    : `Weather is ${currentWeather} (need ${value})`,
            };
        }

        case 'day': {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const currentDay = dayNames[now.getDay()];
            const met = currentDay.toLowerCase() === value.toLowerCase();
            return {
                type, value, met,
                reason: met
                    ? `Today is ${currentDay}`
                    : `Today is ${currentDay} (need ${value})`,
            };
        }

        case 'start_time': {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const startMinutes = parseTimeToMinutes(value);
            const met = currentMinutes >= startMinutes;
            return {
                type, value, met,
                reason: met
                    ? `Time is after ${value}`
                    : `Time is before ${value}`,
            };
        }

        case 'end_time': {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const endMinutes = parseTimeToMinutes(value);
            const met = currentMinutes < endMinutes;
            return {
                type, value, met,
                reason: met
                    ? `Time is before ${value}`
                    : `Time is after ${value}`,
            };
        }

        case 'min_plays': {
            const threshold = parseInt(value, 10);
            const current = app?.playCount ?? 0;
            const met = current >= threshold;
            return {
                type, value, met,
                reason: met
                    ? `Played ${current} times (need ${threshold})`
                    : `Played ${current} times (need ${threshold})`,
            };
        }

        case 'max_plays': {
            const threshold = parseInt(value, 10);
            const current = app?.playCount ?? 0;
            const met = current <= threshold;
            return {
                type, value, met,
                reason: met
                    ? `Played ${current} times (max ${threshold})`
                    : `Played ${current} times (exceeds max ${threshold})`,
            };
        }

        case 'every_x_plays': {
            const interval = parseInt(value, 10);
            const current = app?.playCount ?? 0;
            const met = interval > 0 && current > 0 && current % interval === 0;
            return {
                type, value, met,
                reason: met
                    ? `Play #${current} (every ${interval} plays)`
                    : `Play #${current} (not a multiple of ${interval})`,
            };
        }

        case 'altitude': {
            const altitude = env?.geolocation?.altitude;
            if (altitude === null || altitude === undefined) {
                return { type, value, met: false, reason: 'Altitude unavailable' };
            }
            const comparison = parseComparison(value);
            const met = compareNumbers(altitude, comparison.operator, comparison.threshold);
            return {
                type, value, met,
                reason: met
                    ? `Altitude ${altitude}m ${comparison.operator} ${comparison.threshold}m`
                    : `Altitude ${altitude}m (need ${comparison.operator} ${comparison.threshold}m)`,
            };
        }

        case 'favorite': {
            const isFavorite = app?.isFavorite ?? false;
            const wantFavorite = value.toLowerCase() === 'true';
            const met = isFavorite === wantFavorite;
            return {
                type, value, met,
                reason: met
                    ? isFavorite ? 'Track is favorited'
                    : 'Track is not favorited'
                    : isFavorite ? 'Track is favorited (need unfavorited)'
                    : 'Track is not favorited (need favorited)',
            };
        }

        case 'birthday': {
            if (!app?.userBirthday) {
                return { type, value, met: false, reason: 'Birthday not set' };
            }
            const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const met = today === app.userBirthday;
            return {
                type, value, met,
                reason: met
                    ? "It's your birthday!"
                    : `Not your birthday (need ${app.userBirthday})`,
            };
        }

        case 'weight': {
            // Weight is not a condition to evaluate — it's a probability for random selection
            return {
                type, value, met: true,
                reason: `Weight ${value} (used for random selection, always available)`,
            };
        }

        default: {
            // 'other' or unknown — always pass (flexible condition)
            return {
                type, value, met: true,
                reason: `Custom condition: ${type} = ${value}`,
            };
        }
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Parse "HH:MM" or "H:MM" to minutes since midnight */
function parseTimeToMinutes(time: string): number {
    const parts = time.split(':');
    if (parts.length !== 2) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
}

/** Parse a comparison expression like ">1000", "<500", ">=1000" */
function parseComparison(value: string): { operator: string; threshold: number } {
    const match = value.match(/^(>=|<=|>|<|=)?\s*(\d+(?:\.\d+)?)\s*$/);
    if (!match) return { operator: '>=', threshold: parseFloat(value) || 0 };
    return {
        operator: match[1] || '>=',
        threshold: parseFloat(match[2]),
    };
}

/** Compare two numbers with a comparison operator */
function compareNumbers(actual: number, operator: string, threshold: number): boolean {
    switch (operator) {
        case '>': return actual > threshold;
        case '>=': return actual >= threshold;
        case '<': return actual < threshold;
        case '<=': return actual <= threshold;
        case '=':
        case '==': return actual === threshold;
        default: return actual >= threshold;
    }
}
