/**
 * IPFS URL utility functions for detecting, extracting, and resolving IPFS links.
 *
 * @module utils/ipfsUtils
 */

/**
 * Known IPFS HTTP gateway host prefixes.
 * Each entry is checked with hostname matching (exact or subdomain).
 * All known gateway hosts — extend this array to add new gateways.
 */
export const KNOWN_IPFS_GATEWAY_HOSTS = [
    'ipfs.io',
    'cloudflare-ipfs.com',
    'dweb.link',
    'gateway.pinata.cloud',
    'ipfs.infura.io',
    'nftstorage.link',
    'web3-music-pipeline.mypinata.cloud',
    'soundxyz.mypinata.cloud',
    'gold-broad-gibbon-29.mypinata.cloud',
    'bonfire.mypinata.cloud',
    'spinamp.mypinata.cloud',
    'catalogworks.b-cdn.net',
] as const;

/** Default gateway used by resolveIPFSLink */
export const DEFAULT_IPFS_GATEWAY = 'ipfs.io';

const IPFS_GATEWAY_PATH_SEGMENT = '/ipfs/';

/**
 * Extract the IPFS CID and optional path from any IPFS URL.
 * Returns null if the URL isn't a recognized IPFS URL.
 *
 * Handles:
 * - `ipfs://ipfs/{cid}/path` — native scheme (double ipfs)
 * - `ipfs://{cid}/path` — native scheme
 * - `https://gateway/ipfs/{cid}/path` — standard gateway format
 * - `https://{cid}.ipfs.dweb.link` — subdomain format
 *
 * @param url - The URL to extract from
 * @returns The CID + path (e.g. "QmXxx/file.jpg"), or null
 */
export function extractIPFSPath(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    // Native schemes
    if (url.startsWith('ipfs://ipfs/')) {
        return url.slice(12); // remove "ipfs://ipfs/"
    }
    if (url.startsWith('ipfs://')) {
        return url.slice(7); // remove "ipfs://"
    }

    try {
        const parsed = new URL(url);
        const { hostname, pathname } = parsed;

        // Subdomain format: {cid}.ipfs.dweb.link
        const subdomainMatch = hostname.match(/^([A-Za-z0-9]+)\.ipfs\.dweb\.link$/);
        if (subdomainMatch) {
            return `${subdomainMatch[1]}${pathname}`;
        }

        // Standard gateway format: hostname ends with known host and path starts with /ipfs/
        const isKnownHost = KNOWN_IPFS_GATEWAY_HOSTS.some(
            host => hostname === host || hostname.endsWith('.' + host)
        );

        if (isKnownHost && pathname.startsWith(IPFS_GATEWAY_PATH_SEGMENT)) {
            return pathname.slice(IPFS_GATEWAY_PATH_SEGMENT.length);
        }
    } catch {
        // Not a valid URL — fall through
    }

    return null;
}

/**
 * Check if a URL is an IPFS URL.
 *
 * Detects:
 * - `ipfs://` protocol URLs (native scheme)
 * - URLs on known IPFS gateway hosts with `/ipfs/` path segment
 * - Subdomain format: `{cid}.ipfs.dweb.link`
 *
 * @param url - The URL to check
 * @returns True if the URL is an IPFS URL
 *
 * @example
 * ```ts
 * isIPFS('ipfs://ipfs/QmXxx'); // true
 * isIPFS('ipfs://QmXxx'); // true
 * isIPFS('https://ipfs.io/ipfs/QmXxx'); // true
 * isIPFS('https://cloudflare-ipfs.com/ipfs/QmXxx'); // true
 * isIPFS('https://dweb.link/ipfs/QmXxx'); // true
 * isIPFS('https://gateway.pinata.cloud/ipfs/QmXxx'); // true
 * isIPFS('https://soundxyz.mypinata.cloud/ipfs/QmXxx'); // true
 * isIPFS('https://nftstorage.link/ipfs/QmXxx'); // true
 * isIPFS('https://QmXxx.ipfs.dweb.link'); // true
 * isIPFS('https://example.com/image.png'); // false
 * isIPFS(undefined); // false
 * ```
 */
export function isIPFS(url: string | undefined): boolean {
    if (!url || typeof url !== 'string') return false;

    // Fast check for native scheme
    if (url.startsWith('ipfs://')) return true;

    try {
        const parsed = new URL(url);
        const { hostname, pathname } = parsed;

        // Subdomain format
        if (/^[A-Za-z0-9]+\.ipfs\.dweb\.link$/.test(hostname)) return true;

        // Known gateway host + /ipfs/ path
        const isKnownHost = KNOWN_IPFS_GATEWAY_HOSTS.some(
            host => hostname === host || hostname.endsWith('.' + host)
        );

        if (isKnownHost && pathname.startsWith(IPFS_GATEWAY_PATH_SEGMENT)) return true;
    } catch {
        // Not a valid URL
    }

    return false;
}

/**
 * Resolve an IPFS URL to a specific gateway.
 *
 * Extracts the IPFS CID/path from any recognized IPFS URL format and
 * reconstructs it with the specified gateway host.
 *
 * @param url - The IPFS URL to resolve
 * @param gatewayHost - Gateway host to resolve to (default: ipfs.io)
 * @returns The resolved URL, or the original URL if not IPFS
 *
 * @example
 * ```ts
 * resolveIPFSLink('ipfs://QmXxx'); // 'https://ipfs.io/ipfs/QmXxx'
 * resolveIPFSLink('ipfs://QmXxx', 'cloudflare-ipfs.com'); // 'https://cloudflare-ipfs.com/ipfs/QmXxx'
 * resolveIPFSLink('https://soundxyz.mypinata.cloud/ipfs/QmXxx'); // 'https://ipfs.io/ipfs/QmXxx'
 * resolveIPFSLink('https://QmXxx.ipfs.dweb.link'); // 'https://ipfs.io/ipfs/QmXxx'
 * resolveIPFSLink('https://example.com/file.png'); // 'https://example.com/file.png'
 * resolveIPFSLink(undefined); // undefined
 * ```
 */
export function resolveIPFSLink(
    url: string | undefined,
    gatewayHost: string = DEFAULT_IPFS_GATEWAY
): string | undefined {
    if (!url) return url;

    const ipfsPath = extractIPFSPath(url);
    if (ipfsPath) {
        return `https://${gatewayHost}/ipfs/${ipfsPath}`;
    }

    return url;
}
