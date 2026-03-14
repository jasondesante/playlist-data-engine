/**
 * Arweave Gateway Manager
 *
 * Manages gateway fallback for Arweave URLs. When a file fails to load on one gateway,
 * automatically tries alternate gateways. Uses in-memory caching to remember working
 * gateways for each transaction ID.
 *
 * Design decisions:
 * - Sequential gateway checking (primary -> fallbacks one-by-one)
 * - In-memory cache only (no localStorage)
 * - 5 second timeout per gateway check
 * - 2 hour cache TTL
 *
 * @module utils/arweaveGatewayManager
 */

import {
    GatewayConfig,
    DEFAULT_GATEWAYS,
    isArweaveUrl,
    parseArweaveUrl,
    constructGatewayUrl,
} from './arweaveUtils.js';
import { Logger } from './logger.js';

/**
 * Configuration for the gateway cache entry
 */
export interface GatewayCache {
    /** The 43-character Arweave transaction ID */
    txId: string;
    /** The gateway that was found to work for this txId */
    workingGateway: GatewayConfig;
    /** Timestamp when this cache entry was created (ms since epoch) */
    timestamp: number;
    /** Time-to-live in milliseconds */
    ttl: number;
}

/**
 * Result of a gateway URL resolution
 */
export interface GatewayCheckResult {
    /** The working URL that can be used to fetch the resource */
    workingUrl: string;
    /** The gateway that provided the working URL */
    gateway: GatewayConfig;
    /** Whether this result came from cache */
    cached: boolean;
}

/**
 * Configuration options for ArweaveGatewayManager
 */
export interface ArweaveGatewayManagerConfig {
    /** List of gateways to try in priority order */
    gateways?: GatewayConfig[];
    /** Timeout for each gateway check in milliseconds (default: 5000) */
    timeout?: number;
    /** Cache TTL in milliseconds (default: 7200000 = 2 hours) */
    cacheTTL?: number;
}

/**
 * Default timeout for gateway checks (5 seconds)
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Default cache TTL (2 hours)
 */
const DEFAULT_CACHE_TTL = 7200000;

/**
 * ArweaveGatewayManager class
 *
 * Manages gateway fallback for Arweave URLs with caching support.
 *
 * @example
 * ```ts
 * import { arweaveGatewayManager } from 'playlist-data-engine';
 *
 * // Resolve an Arweave URL to a working gateway
 * const workingUrl = await arweaveGatewayManager.resolveUrl('https://arweave.net/abc123...');
 * // Returns working URL from first responding gateway
 * ```
 */
export class ArweaveGatewayManager {
    private gateways: GatewayConfig[];
    private timeout: number;
    private cacheTTL: number;
    private cache: Map<string, GatewayCache> = new Map();
    private logger = Logger.for('ArweaveGateway');

    constructor(config?: ArweaveGatewayManagerConfig) {
        this.gateways = config?.gateways ?? DEFAULT_GATEWAYS;
        this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
        this.cacheTTL = config?.cacheTTL ?? DEFAULT_CACHE_TTL;

        // Sort gateways by priority
        this.gateways = [...this.gateways].sort((a, b) => a.priority - b.priority);

        this.logger.info('Gateway manager initialized', {
            gateways: this.gateways.map(g => g.host),
            timeout: this.timeout,
            cacheTTL: this.cacheTTL,
        });
    }

    /**
     * Resolve an Arweave URL to a working gateway URL
     *
     * If the URL is not an Arweave URL, returns it unchanged.
     * If cached, returns the cached working URL.
     * Otherwise, tries each gateway in priority order until one works.
     * If all gateways fail, returns the original URL.
     *
     * @param url - The URL to resolve
     * @returns A working URL (or original URL if all gateways fail)
     */
    async resolveUrl(url: string): Promise<string> {
        // Not an Arweave URL, return as-is
        if (!isArweaveUrl(url)) {
            return url;
        }

        // Parse the URL to get txId and pathSuffix
        const parsed = parseArweaveUrl(url);
        if (!parsed) {
            this.logger.warn('Failed to parse Arweave URL, returning original', { url });
            return url;
        }

        const { txId, pathSuffix } = parsed;

        // Check cache first
        const cachedGateway = this.getCachedGateway(txId);
        if (cachedGateway) {
            const workingUrl = constructGatewayUrl(txId, cachedGateway, pathSuffix);
            this.logger.debug('Cache hit for txId', { txId, gateway: cachedGateway.host, pathSuffix });
            return workingUrl;
        }

        this.logger.debug('Cache miss, checking gateways', { txId, pathSuffix });

        // Try each gateway in priority order
        for (const gateway of this.gateways) {
            try {
                const isWorking = await this.checkGateway(txId, gateway, pathSuffix);
                if (isWorking) {
                    // Cache the working gateway
                    this.setCache(txId, gateway);
                    const workingUrl = constructGatewayUrl(txId, gateway, pathSuffix);
                    this.logger.info('Gateway check succeeded', {
                        txId,
                        gateway: gateway.host,
                        pathSuffix,
                        workingUrl,
                    });
                    return workingUrl;
                }
            } catch (error) {
                // Log error but continue to next gateway
                this.logger.debug('Gateway check failed', {
                    txId,
                    gateway: gateway.host,
                    pathSuffix,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        // All gateways failed, return original URL
        this.logger.warn('All gateways failed, returning original URL', { txId, pathSuffix, originalUrl: url });
        return url;
    }

    /**
     * Check if a gateway can serve a transaction
     *
     * Uses a HEAD request with timeout to check if the gateway responds.
     * Handles CORS errors gracefully (treats as failure, not exception).
     *
     * @param txId - The transaction ID to check
     * @param gateway - The gateway to check
     * @param pathSuffix - Optional path suffix to append after txId
     * @returns true if the gateway can serve the transaction
     */
    async checkGateway(txId: string, gateway: GatewayConfig, pathSuffix: string = ''): Promise<boolean> {
        const url = constructGatewayUrl(txId, gateway, pathSuffix);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            // Use HEAD request to check availability without downloading content
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Consider 2xx and 3xx responses as success
            return response.ok || (response.status >= 200 && response.status < 400);
        } catch (error) {
            clearTimeout(timeoutId);

            // Handle timeout
            if (error instanceof Error && error.name === 'AbortError') {
                this.logger.debug('Gateway check timed out', {
                    txId,
                    gateway: gateway.host,
                    timeout: this.timeout,
                });
                return false;
            }

            // Handle CORS errors and network failures
            // CORS errors typically manifest as TypeError with no response
            if (error instanceof TypeError) {
                this.logger.debug('Gateway check failed (likely CORS or network)', {
                    txId,
                    gateway: gateway.host,
                    error: error.message,
                });
                return false;
            }

            // Re-throw unexpected errors
            throw error;
        }
    }

    /**
     * Get the cached working gateway for a transaction ID
     *
     * @param txId - The transaction ID to look up
     * @returns The cached gateway config, or null if not cached or expired
     */
    getCachedGateway(txId: string): GatewayConfig | null {
        const cached = this.cache.get(txId);
        if (!cached) {
            return null;
        }

        // Check if cache entry is still valid
        if (!this.isCacheValid(cached)) {
            this.cache.delete(txId);
            return null;
        }

        return cached.workingGateway;
    }

    /**
     * Cache a working gateway for a transaction ID
     *
     * @param txId - The transaction ID
     * @param gateway - The working gateway to cache
     */
    setCache(txId: string, gateway: GatewayConfig): void {
        const cacheEntry: GatewayCache = {
            txId,
            workingGateway: gateway,
            timestamp: Date.now(),
            ttl: this.cacheTTL,
        };
        this.cache.set(txId, cacheEntry);
        this.logger.debug('Cached working gateway', { txId, gateway: gateway.host });
    }

    /**
     * Clear all cached gateway entries
     */
    clearCache(): void {
        const size = this.cache.size;
        this.cache.clear();
        this.logger.info('Cache cleared', { entriesRemoved: size });
    }

    /**
     * Check if a cache entry is still valid
     *
     * @param cache - The cache entry to check
     * @returns true if the entry is still within its TTL
     */
    private isCacheValid(cache: GatewayCache): boolean {
        const now = Date.now();
        const age = now - cache.timestamp;
        return age < cache.ttl;
    }
}

/**
 * Singleton instance of ArweaveGatewayManager
 *
 * Uses default configuration. For custom configuration, create a new instance.
 *
 * @example
 * ```ts
 * import { arweaveGatewayManager } from 'playlist-data-engine';
 *
 * // Use the singleton
 * const url = await arweaveGatewayManager.resolveUrl('https://arweave.net/abc...');
 * ```
 */
export const arweaveGatewayManager = new ArweaveGatewayManager();
