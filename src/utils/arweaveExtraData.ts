/**
 * Arweave "extra data" corruption — the multipart-upload-envelope signature.
 *
 * arweave.net's AO serving path occasionally answers a normal request with the
 * file's original multipart/form-data upload envelope instead of the payload
 * alone: a boundary line, a `content-type` tag part, the payload inline, then
 * trailing upload fields, closed by a final boundary. The tx data itself is
 * fine — `/raw/{txId}` on the same gateway serves clean bytes, and non-AO
 * gateways never wrap at all.
 *
 * Detecting the envelope from the first bytes of an already-fetched response
 * is what separates this failure ("served, but wrapped") from every other
 * kind: missing (404/410), unhealthy gateway (5xx/network), and genuinely bad
 * content. Only the wrapped case has a working fix — re-fetch through /raw/ —
 * so the sniff must never fire for the others.
 *
 * False-positive surface: a file that genuinely *is* multipart (stored that
 * way on Arweave) sniffs positive, but its recovery just burns a few bounded
 * fetches and lands an accurate finding — an acceptable cost for a class this
 * rare.
 */

import { parseArweaveUrl } from './arweaveUtils.js';

/** What the envelope sniff found, when it found one. */
export interface MultipartSniff {
    /** The envelope's boundary token (without the leading `--`) */
    boundary: string;
}

/**
 * How recovery eventually obtained valid bytes.
 *
 * - `raw-same-host` — `/raw/{txId}` on the gateway that served the wrapped copy
 * - `arweave-net` — the plain URL on arweave.net (first host was a mirror)
 * - `arweave-net-raw` — `/raw/{txId}` on arweave.net
 * - `mirror` — the plain URL on a fallback gateway
 * - `null` — every candidate failed; the file stays unreachable this load
 */
export type ExtraDataRecoveryVia =
    | 'raw-same-host'
    | 'arweave-net'
    | 'arweave-net-raw'
    | 'mirror'
    | null;

/**
 * Record of one confirmed extra-data detection, modeled on
 * PathManifestFinding: fields stay null when unknown rather than guessing.
 */
export interface AoExtraDataFinding {
    /** The transaction whose served copy was wrapped */
    txId: string;
    /** Host that served the wrapped copy */
    host: string;
    /** The URL that failed validation and triggered the sniff */
    url: string;
    /** The envelope boundary found in the served bytes */
    boundary: string;
    /** Payload content type declared inside the envelope's tag part, when parseable */
    sniffedContentType: string | null;
    /** What the caller's validator had rejected the served bytes as (e.g. "json"), when labeled */
    validatedAs: string | null;
    /** Which candidate produced valid bytes (null = all failed) */
    recoveredVia: ExtraDataRecoveryVia;
    /** URL recovery fetched from, when it succeeded */
    recoveredUrl: string | null;
    /** When the detection ran (ms since epoch) */
    detectedAt: number;
    /** Correlation id of the fetch that triggered the detection */
    correlationId?: string;
}

/**
 * Decode window for the sniff. The first boundary line plus its part header
 * sit within ~70 bytes for base64url boundaries, but a generous window keeps
 * the envelope-shape confirmation reliable; callers passing a partial head
 * should give at least the first 128 bytes, ideally 256.
 */
const SNIFF_WINDOW = 256;

/** A multipart boundary line at offset 0: `--` + base64url run + line end. */
const BOUNDARY_LINE = /^--([A-Za-z0-9_-]{16,})\r?\n/;

/** Any part header within the window confirms envelope shape, per MIME case rules. */
const PART_HEADER = /content-disposition/i;

/**
 * Sniff the start of a served file for the multipart-upload envelope.
 *
 * Pure and anchor-at-zero: a wrapped file always begins with its boundary, so
 * a `--` run anywhere later is never enough. Two independent checks must pass
 * — the boundary line shape, then a part header in the same window — so
 * dashed text (markdown rules, horizontal rules) cannot pose as an envelope.
 *
 * Legit JSON (`{`, whitespace, BOM), WAV (`RIFF`), MP3 (`ID3` or a raw
 * `0xFF` frame), and image signatures all fail the first check; there is no
 * content type this could confuse.
 *
 * @param firstBytes - First bytes of the response body (recommend 256), or
 *   an already-decoded text head
 * @returns The boundary token when the envelope is confirmed, else null
 */
export function isMultipartEnvelope(firstBytes: Uint8Array | string): MultipartSniff | null {
    let head: string;
    if (typeof firstBytes === 'string') {
        head = firstBytes.slice(0, SNIFF_WINDOW);
    } else if (firstBytes.length === 0) {
        return null;
    } else {
        // lossy decode is fine — the signature is ASCII, and truncated
        // multibyte tails only affect bytes past the signature
        head = new TextDecoder('utf-8', { fatal: false }).decode(firstBytes.subarray(0, SNIFF_WINDOW));
    }

    const boundaryMatch = head.match(BOUNDARY_LINE);
    if (!boundaryMatch) return null;
    if (!PART_HEADER.test(head)) return null;
    return { boundary: boundaryMatch[1] };
}

// ============================================================================
// Sticky verdict store
// ============================================================================

/**
 * Per-tx memory that a wrapped copy was already confirmed, so later fetches
 * in this session skip re-diagnosis and go straight to the recovery chain.
 * Deliberately forgiving: a verdict expires after the TTL (arweave.net may
 * have fixed itself, and only a re-probe of the plain URL can discover that),
 * and a clean validation of the plain URL clears the verdict on the spot.
 *
 * Session-only by convention: like the path-manifest findings, the engine
 * keeps bug records in bounded memory only — durable tracking is the host
 * app's job (ApeTapes persists detections via the status-event sink). A page
 * reload resets the notebook; the next fetch of a known tx simply
 * re-diagnoses once.
 *
 * Module-level on purpose — the verdict describes arweave.net's serving
 * behavior, not any one gateway-manager instance.
 */

/** How long a confirmed verdict steers fetches to raw before re-probing the plain URL. */
export const EXTRA_DATA_VERDICT_TTL_MS = 24 * 60 * 60 * 1000;

/** Upper bound on tracked txs; oldest verdicts evicted first. */
const EXTRA_DATA_VERDICT_CAP = 100;

interface ExtraDataVerdict {
    /** Host that served the wrapped copy */
    host: string;
    /** When the detection ran (ms since epoch) */
    detectedAt: number;
}

const verdicts = new Map<string, ExtraDataVerdict>();

/**
 * Record a confirmed wrapped-copy detection for a tx. Oldest verdicts are
 * evicted once the cap is exceeded — this store only needs to remember the
 * recent history of a rare bug.
 */
export function markExtraData(txId: string, host: string): void {
    if (!txId) return;
    verdicts.set(txId, { host, detectedAt: Date.now() });

    if (verdicts.size > EXTRA_DATA_VERDICT_CAP) {
        const oldest = [...verdicts.entries()]
            .sort((a, b) => a[1].detectedAt - b[1].detectedAt)
            .slice(0, verdicts.size - EXTRA_DATA_VERDICT_CAP);
        for (const [txIdToRemove] of oldest) verdicts.delete(txIdToRemove);
    }
}

/**
 * The fresh verdict for a tx — host + detection time — or null when never
 * detected, cleared, or past the TTL. Expired entries are dropped on sight.
 */
export function getFreshExtraData(txId: string): ExtraDataVerdict | null {
    if (!txId) return null;
    const v = verdicts.get(txId);
    if (!v) return null;
    if (Date.now() - v.detectedAt > EXTRA_DATA_VERDICT_TTL_MS) {
        verdicts.delete(txId);
        return null;
    }
    return { host: v.host, detectedAt: v.detectedAt };
}

/**
 * Forgiveness in its explicit form: the plain URL validated clean, so stop
 * steering this tx to raw. (TTL expiry is the implicit form.)
 */
export function clearExtraData(txId: string): void {
    verdicts.delete(txId);
}

/** Wipe every verdict. Host apps can call this from their diagnostics UI. */
export function clearAllExtraDataVerdicts(): void {
    verdicts.clear();
}

// ============================================================================
// Recovery candidates
// ============================================================================

/** The non-null members of ExtraDataRecoveryVia — every candidate can win. */
export type ExtraDataRecoveryKind = Exclude<ExtraDataRecoveryVia, null>;

/**
 * One URL the recovery chain may try, in walk order. Raw candidates are
 * direct fetches to known hosts — they must never go through resolveUrl,
 * which drops the `/raw/` prefix (see GATEWAY_RESOLUTION.md).
 */
export interface ExtraDataCandidate {
    /** `raw` fetches the untouched payload endpoint; `plain` is the normal URL */
    kind: 'raw' | 'plain';
    /** Host the candidate fetches from */
    host: string;
    /** Fully-formed fetchable URL */
    url: string;
    /** Label for the finding when this candidate produces valid bytes */
    via: ExtraDataRecoveryKind;
}

/**
 * The recovery chain for a wrapped-copy detection on `failedUrl`, per the
 * max-2-hosts rule: the host that served the wrapped copy gets its raw
 * tried first; arweave.net (plain + raw) follows when the failed host
 * wasn't arweave.net; when it was, one mirror gateway's plain URL is the
 * last resort. Mirror candidates come from `mirrorHosts` (the caller's
 * current gateway priority order), skipping the failed host.
 *
 * Candidates target the bare txId the failed URL carries — a manifest+path
 * URL's txId is the manifest, and mapping paths to per-file txIds is the
 * path-manifest machinery's job, not this one. (ApeTapes resolves manifest
 * entries to bare-tx URLs before validating, which is the supported shape.)
 */
export function getExtraDataCandidates(failedUrl: string, mirrorHosts: string[]): ExtraDataCandidate[] {
    const parsed = parseArweaveUrl(failedUrl);
    if (!parsed) return [];

    let host = 'arweave.net';
    try {
        const parsedUrl = new URL(failedUrl);
        // non-special schemes (ar://) put their "authority" in host — only
        // http(s) hosts mean a real gateway
        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            host = parsedUrl.host.replace(/^www\./, '');
        }
    } catch {
        // unparseable — the canonical https origin is arweave.net
    }

    const out: ExtraDataCandidate[] = [];
    const push = (kind: 'raw' | 'plain', candidateHost: string, via: ExtraDataRecoveryKind): void => {
        out.push({
            kind,
            host: candidateHost,
            url: `https://${candidateHost}/${kind === 'raw' ? 'raw/' : ''}${parsed.txId}`,
            via,
        });
    };

    if (host === 'arweave.net') {
        push('raw', 'arweave.net', 'raw-same-host');
        const mirror = mirrorHosts.find(h => h.replace(/^www\./, '') !== host);
        if (mirror) push('plain', mirror, 'mirror');
    } else {
        push('raw', host, 'raw-same-host');
        push('plain', 'arweave.net', 'arweave-net');
        push('raw', 'arweave.net', 'arweave-net-raw');
    }
    return out;
}

/**
 * The payload content type declared inside the envelope's `content-type`
 * tag part — the upload's own opinion of what the file is, useful as
 * finding evidence. Null when the part isn't in the head.
 */
export function extractEnvelopeContentType(firstBytes: Uint8Array | string): string | null {
    const head = typeof firstBytes === 'string'
        ? firstBytes.slice(0, SNIFF_WINDOW)
        : new TextDecoder('utf-8', { fatal: false }).decode(firstBytes.subarray(0, SNIFF_WINDOW));
    const match = head.match(/content-disposition:\s*form-data;\s*name="content-type"\s*\r?\n\r?\n([^\r\n;]+)/i);
    return match ? match[1].trim() : null;
}
