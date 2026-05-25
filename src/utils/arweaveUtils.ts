/**
 * Arweave URL Utilities
 *
 * Provides utilities for parsing and constructing Arweave gateway URLs.
 * Supports multiple gateways for fallback functionality.
 *
 * @module utils/arweaveUtils
 */

/**
 * Configuration for an Arweave gateway
 */
export interface GatewayConfig {
    /** Gateway hostname (e.g., 'arweave.net') */
    host: string;
    /** Protocol to use (default: 'https') */
    protocol: 'http' | 'https';
    /** Priority order for gateway selection (lower = higher priority) */
    priority: number;
}

/**
 * Parsed information from an Arweave URL
 */
export interface ArweaveUrlInfo {
    /** The 43-character Arweave transaction ID */
    txId: string;
    /** The original URL that was parsed */
    originalUrl: string;
    /** Additional path after the txId (e.g., '/model.json', '/image.png') */
    pathSuffix: string;
}

/**
 * Default gateway configurations in priority order
 */
export const DEFAULT_GATEWAYS: GatewayConfig[] = [
    { host: 'arweave.net', protocol: 'https', priority: 1 },
    { host: 'ardrive.net', protocol: 'https', priority: 2 },
    { host: 'turbo-gateway.com', protocol: 'https', priority: 3 },
];

/**
 * Known Arweave gateway hosts for URL detection
 */
export const KNOWN_GATEWAY_HOSTS = [
    'arweave.net',
    'ardrive.net',
    'turbo-gateway.com',
] as const;

/**
 * Regex pattern for extracting 43-character Arweave transaction IDs
 * Arweave IDs are base64url encoded and exactly 43 characters
 */
const ARWEAVE_TX_ID_PATTERN = /[a-zA-Z0-9_-]{43}/;

/**
 * Check if a URL is an Arweave URL
 *
 * Detects:
 * - `ar://` protocol URLs
 * - URLs containing known Arweave gateway hosts
 *
 * @param url - The URL to check
 * @returns True if the URL is an Arweave URL
 *
 * @example
 * ```ts
 * isArweaveUrl('ar://abc123...'); // true
 * isArweaveUrl('https://arweave.net/abc123...'); // true
 * isArweaveUrl('https://example.com/audio.mp3'); // false
 * ```
 */
export function isArweaveUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Check for ar:// protocol
    if (url.startsWith('ar://')) {
        return true;
    }

    // Check for known gateway hosts in the URL
    const urlLower = url.toLowerCase();
    return KNOWN_GATEWAY_HOSTS.some(host => urlLower.includes(host));
}

/**
 * Parse an Arweave URL to extract transaction ID and any path suffix
 *
 * Handles both formats:
 * - `ar://{txId}` - Native Arweave protocol
 * - `ar://{txId}/path/to/file` - Native protocol with path suffix
 * - `https://arweave.net/{txId}` - HTTP gateway URL
 * - `https://arweave.net/{txId}/path/to/file` - HTTP gateway with path suffix
 *
 * @param url - The Arweave URL to parse
 * @returns Parsed URL info or null if not a valid Arweave URL
 *
 * @example
 * ```ts
 * parseArweaveUrl('ar://abc123...');
 * // { txId: 'abc123...', originalUrl: 'ar://abc123...', pathSuffix: '' }
 *
 * parseArweaveUrl('https://arweave.net/abc123.../model.json');
 * // { txId: 'abc123...', originalUrl: '...', pathSuffix: '/model.json' }
 *
 * parseArweaveUrl('https://example.com/audio.mp3');
 * // null
 * ```
 */
export function parseArweaveUrl(url: string): ArweaveUrlInfo | null {
    if (!url || typeof url !== 'string') {
        return null;
    }

    // Check if it's an Arweave URL
    if (!isArweaveUrl(url)) {
        return null;
    }

    let txId: string | null = null;
    let pathSuffix = '';

    // Handle ar:// protocol
    if (url.startsWith('ar://')) {
        const afterProtocol = url.slice(5); // Remove 'ar://' prefix
        // Check if there's a path after the txId
        const slashIndex = afterProtocol.indexOf('/');
        if (slashIndex !== -1) {
            txId = afterProtocol.slice(0, slashIndex);
            pathSuffix = afterProtocol.slice(slashIndex);
        } else {
            txId = afterProtocol;
        }
        // Validate it's a proper txId (43 chars)
        if (txId.length === 43 && /^[A-Za-z0-9_-]+$/.test(txId)) {
            return { txId, originalUrl: url, pathSuffix };
        }
        return null;
    }

    // For HTTP URLs, try to extract txId using regex
    // This handles various URL patterns like:
    // - https://arweave.net/{txId}
    // - https://arweave.net/{txId}/path/to/file
    // - https://ardrive.net/{txId}?query=...
    const ARWEAVE_TXID_REGEX = /[A-Za-z0-9_-]{43}/g;
    const matches = url.match(ARWEAVE_TXID_REGEX);
    if (matches && matches.length > 0) {
        // Get the first 43-character match that looks like a txId
        txId = matches[0];

        // Find where the txId ends in the URL and extract any path suffix
        const txIdIndex = url.indexOf(txId);
        if (txIdIndex !== -1) {
            const afterTxId = url.slice(txIdIndex + 43);
            // Extract path (everything before query string or fragment)
            const queryIndex = Math.min(
                afterTxId.indexOf('?') === -1 ? Infinity : afterTxId.indexOf('?'),
                afterTxId.indexOf('#') === -1 ? Infinity : afterTxId.indexOf('#')
            );
            if (queryIndex === Infinity) {
                pathSuffix = afterTxId;
            } else {
                pathSuffix = afterTxId.slice(0, queryIndex);
            }
        }

        return { txId, originalUrl: url, pathSuffix };
    }

    return null;
}

/**
 * Construct a gateway URL from a transaction ID and gateway config
 *
 * @param txId - The 43-character Arweave transaction ID
 * @param gateway - The gateway configuration to use
 * @param pathSuffix - Optional path suffix to append after txId (e.g., '/file.jpg')
 * @returns The constructed gateway URL
 *
 * @example
 * ```ts
 * constructGatewayUrl('abc123...', { host: 'arweave.net', protocol: 'https', priority: 1 });
 * // 'https://arweave.net/abc123...'
 *
 * constructGatewayUrl('abc123...', { host: 'arweave.net', protocol: 'https', priority: 1 }, '/model.json');
 * // 'https://arweave.net/abc123.../model.json'
 * ```
 */
export function constructGatewayUrl(txId: string, gateway: GatewayConfig, pathSuffix: string = ''): string {
    const protocol = gateway.protocol || 'https';
    return `${protocol}://${gateway.host}/${txId}${pathSuffix}`;
}

/**
 * Get all gateway URLs for a transaction ID in priority order
 *
 * @param txId - The 43-character Arweave transaction ID
 * @param gateways - Array of gateway configs (defaults to DEFAULT_GATEWAYS)
 * @param pathSuffix - Optional path suffix to append after txId (e.g., '/file.jpg')
 * @returns Array of gateway URLs in priority order
 *
 * @example
 * ```ts
 * getAllGatewayUrls('abc123...');
 * // ['https://arweave.net/abc123...', 'https://ar.io/abc123...', ...]
 *
 * getAllGatewayUrls('abc123...', DEFAULT_GATEWAYS, '/model.json');
 * // ['https://arweave.net/abc123.../model.json', ...]
 * ```
 */
export function getAllGatewayUrls(
    txId: string,
    gateways: GatewayConfig[] = DEFAULT_GATEWAYS,
    pathSuffix: string = ''
): string[] {
    return gateways
        .sort((a, b) => a.priority - b.priority)
        .map(gateway => constructGatewayUrl(txId, gateway, pathSuffix));
}
