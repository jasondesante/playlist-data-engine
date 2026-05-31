/**
 * Track extras extraction — stems, alternate mixes, and condition evaluation.
 *
 * These functions operate on parsed metadata objects (the output of
 * MetadataExtractor.parseMetadata). They provide:
 *
 * - getTrackMetadata: Full raw parsed metadata passthrough
 * - getTrackExtras: Summary of available stems, mixes, and their conditions
 * - evaluateMixConditions: Evaluate mix conditions against sensor context
 *
 * @module core/parser/TrackExtras
 */

import type { EnvironmentalContext } from '../types/Environmental.js';

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
            if (typeof c.type === 'string' && typeof c.value === 'string') {
                conditions.push({ type: c.type, value: c.value });
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
 * const context: EvaluationContext = {
 *   environment: environmentalSensors.getContext(),
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
