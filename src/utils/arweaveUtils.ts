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
}

/**
 * Default gateway configurations in priority order
 */
export const DEFAULT_GATEWAYS: GatewayConfig[] = [
    { host: 'arweave.net', protocol: 'https', priority: 1 },
    { host: 'ar.io', protocol: 'https', priority: 2 },
    { host: 'ardrive.net', protocol: 'https', priority: 3 },
    { host: 'turbo-gateway.com', protocol: 'https', priority: 4 },
];

/**
 * Known Arweave gateway hosts for URL detection
 */
const KNOWN_GATEWAY_HOSTS = [
    'arweave.net',
    'ar.io',
    'ardrive.net',
    'turbo-gateway.com',
];

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
 * Parse an Arweave URL to extract transaction ID
 *
 * Handles both formats:
 * - `ar://{txId}` - Native Arweave protocol
 * - `https://arweave.net/{txId}` - HTTP gateway URL
 *
 * @param url - The Arweave URL to parse
 * @returns Parsed URL info or null if not a valid Arweave URL
 *
 * @example
 * ```ts
 * parseArweaveUrl('ar://abc123...');
 * // { txId: 'abc123...', originalUrl: 'ar://abc123...' }
 *
 * parseArweaveUrl('https://arweave.net/abc123...');
 * // { txId: 'abc123...', originalUrl: 'https://arweave.net/abc123...' }
 *
 * parseArweaveUrl('https://example.com/audio.mp3');
 * // null
 * ```
 */
export function parseArweaveUrl(url: string): ArweaveUrlInfo | null {
    if (!url || typeof url !== 'string') {
        return null;
    }

    // Handle ar:// protocol
    if (url.startsWith('ar://')) {
        const txId = url.slice(5); // Remove 'ar://' prefix
        // Validate it looks like a transaction ID (43 chars, base64url)
        if (txId.length === 43 && /^[a-zA-Z0-9_-]+$/.test(txId)) {
            return { txId, originalUrl: url };
        }
        return null;
    }

    // Handle HTTP gateway URLs
    // Try to extract txId from URL path
    const match = url.match(ARWEAVE_TX_ID_PATTERN);
    if (match && isArweaveUrl(url)) {
        return { txId: match[0], originalUrl: url };
    }

    return null;
}

/**
 * Construct a gateway URL from a transaction ID and gateway config
 *
 * @param txId - The 43-character Arweave transaction ID
 * @param gateway - The gateway configuration to use
 * @returns The constructed gateway URL
 *
 * @example
 * ```ts
 * constructGatewayUrl('abc123...', { host: 'arweave.net', protocol: 'https', priority: 1 });
 * // 'https://arweave.net/abc123...'
 * ```
 */
export function constructGatewayUrl(txId: string, gateway: GatewayConfig): string {
    return `${gateway.protocol}://${gateway.host}/${txId}`;
}
