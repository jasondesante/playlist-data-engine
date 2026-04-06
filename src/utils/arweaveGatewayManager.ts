/**
 * Arweave Gateway Manager
 *
 * Manages gateway fallback for Arweave URLs. When a file fails to load on one gateway,
 * automatically tries alternate gateways. Uses in-memory caching to remember working
 * gateways for each transaction ID.
 *
 * Design decisions:
 * - Sequential gateway checking (primary -> fallbacks one-by-one)
 * - localStorage persistence for active gateway across sessions
 * - 5 second timeout per gateway check
 * - 2 hour cache TTL
 * - Active gateway is reused without HEAD checks; only real fetch failures trigger fallback
 *
 * @module utils/arweaveGatewayManager
 */

import type { GatewayConfig } from './arweaveUtils.js';
import {
    DEFAULT_GATEWAYS,
    isArweaveUrl,
    parseArweaveUrl,
    constructGatewayUrl,
} from './arweaveUtils.js';
import { Logger } from './logger.js';

/**
 * Dynamically import Wayfinder to avoid bundling Node.js `crypto` polyfills
 * into the main build. Only used by resolveUrlWayfinder().
 */
type Wayfinder = Awaited<ReturnType<typeof import('@ar.io/wayfinder-core')['createWayfinderClient']>> & { resolveUrl: (opts: { originalUrl: string }) => Promise<{ hostname: string; protocol: string }> };

async function loadWayfinder(): Promise<typeof import('@ar.io/wayfinder-core') | null> {
    try {
        return await import('@ar.io/wayfinder-core');
    } catch {
        return null;
    }
}

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
 * Options for prefetching URLs
 */
export interface PrefetchOptions {
    /** Maximum number of concurrent gateway checks (default: 5) */
    concurrency?: number;
    /** Whether to continue on errors (default: true) */
    continueOnError?: boolean;
}

/**
 * Result of prefetching a single URL
 */
export interface PrefetchResultEntry {
    /** The original URL that was prefetched */
    url: string;
    /** The transaction ID extracted from the URL */
    txId: string;
    /** Whether the prefetch succeeded */
    success: boolean;
    /** The working gateway (if successful) */
    gateway?: GatewayConfig;
    /** Error message (if failed) */
    error?: string;
}

/**
 * Result of prefetching multiple URLs
 */
export interface PrefetchResult {
    /** Total number of URLs processed */
    total: number;
    /** Number of successful prefetches */
    succeeded: number;
    /** Number of failed prefetches */
    failed: number;
    /** Number of URLs skipped (not Arweave URLs) */
    skipped: number;
    /** Detailed results for each URL */
    entries: PrefetchResultEntry[];
}

/**
 * Statistics about the gateway cache
 */
export interface CacheStats {
    /** Number of entries in the cache */
    size: number;
    /** List of cached transaction IDs */
    txIds: string[];
    /** Cache hit count (since last clear) */
    hitCount: number;
    /** Cache miss count (since last clear) */
    missCount: number;
    /** Cache TTL in milliseconds */
    ttl: number;
}

/**
 * Health statistics for a single gateway
 */
export interface GatewayHealthStats {
    /** Gateway hostname */
    host: string;
    /** Current priority (lower = higher priority) */
    priority: number;
    /** Original priority from configuration */
    originalPriority: number;
    /** Number of successful checks */
    successCount: number;
    /** Number of failed checks */
    failureCount: number;
    /** Total number of checks */
    totalChecks: number;
    /** Success rate (0-1) */
    successRate: number;
    /** Average response time in milliseconds */
    averageResponseTime: number;
    /** Last successful check timestamp (ms since epoch) */
    lastSuccess: number | null;
    /** Last failure timestamp (ms since epoch) */
    lastFailure: number | null;
    /** Whether the gateway is currently considered healthy */
    isHealthy: boolean;
}

/**
 * Result of running a health check on all gateways
 */
export interface HealthCheckResult {
    /** Timestamp when the health check was performed */
    timestamp: number;
    /** Health stats for each gateway */
    gateways: GatewayHealthStats[];
    /** List of healthy gateway hosts */
    healthyGateways: string[];
    /** List of unhealthy gateway hosts */
    unhealthyGateways: string[];
    /** Gateway with the best response time (if any) */
    fastestGateway: string | null;
    /** Total time taken for the health check in ms */
    totalTime: number;
}

/**
 * Options for running a health check
 */
export interface HealthCheckOptions {
    /** Transaction ID to use for health check (default: a well-known stable txId) */
    txId?: string;
    /** Whether to adjust priorities based on results (default: false) */
    adjustPriorities?: boolean;
    /** Minimum number of checks before considering adjusting priorities (default: 3) */
    minChecksForAdjustment?: number;
    /** Threshold for considering a gateway healthy (success rate, default: 0.5) */
    healthyThreshold?: number;
    /** Maximum response time to consider a gateway "fast" in ms (default: 2000) */
    fastThreshold?: number;
}

/**
 * Response time record for tracking gateway performance
 */
interface ResponseTimeRecord {
    /** Response time in milliseconds */
    responseTime: number;
    /** Whether the check was successful */
    success: boolean;
    /** Timestamp of the check */
    timestamp: number;
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
 * localStorage key for persisting the active gateway across sessions
 */
const ACTIVE_GATEWAY_STORAGE_KEY = 'arweave_active_gateway';

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
    /** Cache hit counter for statistics */
    private hitCount: number = 0;
    /** Cache miss counter for statistics */
    private missCount: number = 0;
    /** Health tracking data for each gateway (keyed by host) */
    private healthData: Map<string, ResponseTimeRecord[]> = new Map();
    /** Original gateway priorities (for potential reset) */
    private originalPriorities: Map<string, number> = new Map();
    /** Maximum number of response time records to keep per gateway */
    private readonly MAX_HEALTH_RECORDS = 50;
    /** AR.IO Wayfinder client for dynamic routing */
    private wayfinder: Wayfinder | null = null;
    /** The currently active dynamic gateway. Used globally to prevent constant switching. */
    private activeGateway: GatewayConfig | null = null;

    constructor(config?: ArweaveGatewayManagerConfig) {
        // Deep-clone gateways to avoid mutating the original config objects
        this.gateways = (config?.gateways ?? DEFAULT_GATEWAYS).map(g => ({ ...g }));
        this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
        this.cacheTTL = config?.cacheTTL ?? DEFAULT_CACHE_TTL;

        // Sort gateways by priority
        this.gateways.sort((a, b) => a.priority - b.priority);

        // Store original priorities
        this.gateways.forEach(g => {
            this.originalPriorities.set(g.host, g.priority);
        });

        // Restore active gateway from localStorage (persists across sessions)
        this.activeGateway = this.loadPersistedGateway();

        // Initialize Wayfinder lazily (deferred to avoid bundling Node.js crypto polyfills)
        loadWayfinder().then(mod => {
            if (mod) {
                this.wayfinder = mod.createWayfinderClient();
                this.logger.info('Wayfinder client initialized');
            }
        });

        this.logger.info('Gateway manager initialized', {
            gateways: this.gateways.map(g => g.host),
            timeout: this.timeout,
            cacheTTL: this.cacheTTL,
            activeGateway: this.activeGateway?.host ?? null,
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
    // async resolveUrl(url: string): Promise<string> {
    async resolveUrlOld(url: string): Promise<string> {
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
            this.hitCount++;
            const workingUrl = constructGatewayUrl(txId, cachedGateway, pathSuffix);
            this.logger.debug('Cache hit for txId', { txId, gateway: cachedGateway.host, pathSuffix });
            return workingUrl;
        }

        this.missCount++;
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
     * Wrap a promise with a timeout to prevent hanging indefinitely.
     * Useful for third-party calls (e.g., Wayfinder) that have no built-in timeout.
     */
    private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(message)), ms);
            promise.then(
                (value) => { clearTimeout(timer); resolve(value); },
                (error) => { clearTimeout(timer); reject(error); },
            );
        });
    }

    /**
     * Resolve an Arweave URL using AR.IO Wayfinder as the primary strategy,
     * with static gateways as fallback.
     *
     * This is the experimental Wayfinder-powered resolver. It tries:
     * 1. Cache
     * 2. Previously active gateway
     * 3. AR.IO Wayfinder dynamic resolution
     * 4. Static gateway fallback
     *
     * @param url - The URL to resolve
     * @returns A working URL (or original URL if all gateways fail)
     */
    // async resolveUrlWayfinder(url: string): Promise<string> {
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

        // Check per-txId cache first
        const cachedGateway = this.getCachedGateway(txId);
        if (cachedGateway) {
            this.hitCount++;
            const workingUrl = constructGatewayUrl(txId, cachedGateway, pathSuffix);
            this.logger.debug('Cache hit for txId', { txId, gateway: cachedGateway.host, pathSuffix });
            return workingUrl;
        }

        // If we have an active gateway, use it directly without a HEAD check.
        // The caller should use reportGatewayFailure() if the actual fetch fails.
        if (this.activeGateway) {
            this.setCache(txId, this.activeGateway);
            const workingUrl = constructGatewayUrl(txId, this.activeGateway, pathSuffix);
            this.logger.debug('Using active gateway (no HEAD check)', {
                txId,
                host: this.activeGateway.host,
            });
            return workingUrl;
        }

        // No active gateway yet — find one (this only runs on first resolve of a session)
        return this.findAndSetGateway(url, txId, pathSuffix);
    }

    /**
     * Report that the active gateway failed a real fetch.
     *
     * Call this when the URL returned by resolveUrl() actually fails to load
     * (e.g. fetch() returns a 4xx/5xx or throws). This clears the active gateway
     * and finds a new one, persisting the result to localStorage.
     *
     * @param url - The URL that failed
     * @returns A new working URL (or original if all gateways fail)
     */
    async reportGatewayFailure(url: string): Promise<string> {
        const parsed = parseArweaveUrl(url);
        if (!parsed) return url;
        const { txId, pathSuffix } = parsed;

        this.logger.warn('Real fetch failure reported, finding new gateway', {
            failedHost: this.activeGateway?.host,
            txId,
        });

        this.activeGateway = null;
        this.cache.delete(txId);
        this.clearPersistedGateway();

        return this.findAndSetGateway(url, txId, pathSuffix);
    }

    /**
     * Find a working gateway by trying Wayfinder then static gateways,
     * set it as the active gateway, cache it, and persist to localStorage.
     */
    private async findAndSetGateway(url: string, txId: string, pathSuffix: string): Promise<string> {
        this.missCount++;
        this.logger.debug('Finding gateway for txId', { txId, pathSuffix });

        // Try Wayfinder resolution if available (with timeout to prevent hanging)
        if (this.wayfinder) {
            try {
                this.logger.debug('Attempting Wayfinder resolution', { txId });
                const wayfinderUrlObj = await this.withTimeout(
                    this.wayfinder.resolveUrl({ originalUrl: url }),
                    this.timeout,
                    'Wayfinder resolution timed out'
                );
                const wayfinderHost = wayfinderUrlObj.hostname;
                const wayfinderProtocol = wayfinderUrlObj.protocol.replace(':', '') as 'http' | 'https';

                const wayfinderGateway: GatewayConfig = {
                    host: wayfinderHost,
                    protocol: wayfinderProtocol,
                    priority: 0,
                };

                const isWorking = await this.checkGateway(txId, wayfinderGateway, pathSuffix);
                if (isWorking) {
                    this.setActiveGateway(wayfinderGateway, txId);
                    const workingUrl = constructGatewayUrl(txId, wayfinderGateway, pathSuffix);
                    this.logger.info('Wayfinder resolution succeeded', {
                        txId,
                        gateway: wayfinderHost,
                        pathSuffix,
                        workingUrl,
                    });
                    return workingUrl;
                }
                this.logger.debug('Wayfinder gateway did not pass health check, falling back to static gateways', {
                    txId,
                    host: wayfinderHost,
                });
            } catch (error) {
                this.logger.warn('Wayfinder resolution failed, falling back to static gateways', {
                    txId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        // Fallback: Try each static gateway in priority order
        for (const gateway of this.gateways) {
            try {
                const isWorking = await this.checkGateway(txId, gateway, pathSuffix);
                if (isWorking) {
                    this.setActiveGateway(gateway, txId);
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
     * Set the active gateway, cache it for the txId, and persist to localStorage.
     */
    private setActiveGateway(gateway: GatewayConfig, txId: string): void {
        this.activeGateway = gateway;
        this.setCache(txId, gateway);
        this.persistGateway(gateway);
    }

    /**
     * Load the persisted active gateway from localStorage.
     */
    private loadPersistedGateway(): GatewayConfig | null {
        try {
            if (typeof localStorage === 'undefined') return null;
            const stored = localStorage.getItem(ACTIVE_GATEWAY_STORAGE_KEY);
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed.host === 'string' && typeof parsed.protocol === 'string') {
                this.logger.info('Restored active gateway from localStorage', { host: parsed.host });
                return parsed as GatewayConfig;
            }
        } catch {
            // localStorage unavailable or corrupted — ignore
        }
        return null;
    }

    /**
     * Persist the active gateway to localStorage.
     */
    private persistGateway(gateway: GatewayConfig): void {
        try {
            if (typeof localStorage === 'undefined') return;
            localStorage.setItem(ACTIVE_GATEWAY_STORAGE_KEY, JSON.stringify(gateway));
        } catch {
            // localStorage unavailable — ignore
        }
    }

    /**
     * Clear the persisted gateway from localStorage.
     */
    private clearPersistedGateway(): void {
        try {
            if (typeof localStorage === 'undefined') return;
            localStorage.removeItem(ACTIVE_GATEWAY_STORAGE_KEY);
        } catch {
            // localStorage unavailable — ignore
        }
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
        const startTime = Date.now();

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
            const responseTime = Date.now() - startTime;

            // Consider 2xx and 3xx responses as success
            const success = response.ok || (response.status >= 200 && response.status < 400);

            // Record response for health tracking
            this.recordGatewayResponse(gateway.host, responseTime, success);

            return success;
        } catch (error) {
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            // Record failed response for health tracking
            this.recordGatewayResponse(gateway.host, responseTime, false);

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
        this.hitCount = 0;
        this.missCount = 0;
        this.logger.info('Cache cleared', { entriesRemoved: size });
    }

    /**
     * Prefetch and cache gateways for multiple URLs in parallel
     *
     * This is useful for warming up the cache at app startup with known model URLs.
     * URLs are resolved in parallel with configurable concurrency.
     *
     * @param urls - Array of URLs to prefetch (non-Arweave URLs are skipped)
     * @param options - Prefetch options
     * @returns Result summary with success/failure counts and details
     *
     * @example
     * ```ts
     * const result = await arweaveGatewayManager.prefetchUrls([
     *     'https://arweave.net/abc123.../model.json',
     *     'https://arweave.net/def456.../model.json',
     * ]);
     * console.log(`Prefetched ${result.succeeded}/${result.total} URLs`);
     * ```
     */
    async prefetchUrls(urls: string[], options?: PrefetchOptions): Promise<PrefetchResult> {
        const concurrency = options?.concurrency ?? 5;
        const continueOnError = options?.continueOnError ?? true;

        const entries: PrefetchResultEntry[] = [];
        let succeeded = 0;
        let failed = 0;
        let skipped = 0;

        // Process URLs in batches for controlled concurrency
        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);

            const batchResults = await Promise.allSettled(
                batch.map(async (url): Promise<PrefetchResultEntry> => {
                    // Skip non-Arweave URLs
                    if (!isArweaveUrl(url)) {
                        return {
                            url,
                            txId: '',
                            success: false,
                            error: 'Not an Arweave URL',
                        };
                    }

                    // Parse URL to get txId
                    const parsed = parseArweaveUrl(url);
                    if (!parsed) {
                        return {
                            url,
                            txId: '',
                            success: false,
                            error: 'Failed to parse Arweave URL',
                        };
                    }

                    // Check if already cached
                    const cached = this.getCachedGateway(parsed.txId);
                    if (cached) {
                        return {
                            url,
                            txId: parsed.txId,
                            success: true,
                            gateway: cached,
                        };
                    }

                    // Resolve URL (this will check gateways and cache the result)
                    await this.resolveUrl(url);
                    const resolvedGateway = this.getCachedGateway(parsed.txId);

                    if (resolvedGateway) {
                        return {
                            url,
                            txId: parsed.txId,
                            success: true,
                            gateway: resolvedGateway,
                        };
                    } else {
                        return {
                            url,
                            txId: parsed.txId,
                            success: false,
                            error: 'All gateways failed',
                        };
                    }
                })
            );

            // Collect results
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    const entry = result.value;
                    entries.push(entry);

                    if (entry.error === 'Not an Arweave URL') {
                        skipped++;
                    } else if (entry.success) {
                        succeeded++;
                    } else {
                        failed++;
                    }
                } else {
                    // Promise rejected (shouldn't happen with our implementation)
                    failed++;
                    entries.push({
                        url: 'unknown',
                        txId: '',
                        success: false,
                        error: result.reason?.message ?? 'Unknown error',
                    });
                }
            }

            // Stop processing if continueOnError is false and we have failures
            if (!continueOnError && failed > 0) {
                this.logger.warn('Prefetch stopped due to failures', { failed, processed: entries.length });
                break;
            }
        }

        this.logger.info('Prefetch complete', {
            total: urls.length,
            succeeded,
            failed,
            skipped,
        });

        return {
            total: urls.length,
            succeeded,
            failed,
            skipped,
            entries,
        };
    }

    /**
     * Get statistics about the gateway cache
     *
     * @returns Cache statistics including size, entries, and hit/miss counts
     *
     * @example
     * ```ts
     * const stats = arweaveGatewayManager.getCacheStats();
     * console.log(`Cache has ${stats.size} entries, hit rate: ${stats.hitCount / (stats.hitCount + stats.missCount)}`);
     * ```
     */
    getCacheStats(): CacheStats {
        const entries = Array.from(this.cache.entries());
        const now = Date.now();

        // Filter to only valid (non-expired) entries
        const validTxIds = entries
            .filter(([, cache]) => now - cache.timestamp < cache.ttl)
            .map(([txId]) => txId);

        return {
            size: validTxIds.length,
            txIds: validTxIds,
            hitCount: this.hitCount,
            missCount: this.missCount,
            ttl: this.cacheTTL,
        };
    }

    /**
     * Get all cached gateway entries (for debugging)
     *
     * @returns Array of all cache entries (including expired ones)
     */
    getCacheEntries(): GatewayCache[] {
        return Array.from(this.cache.values());
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

    /**
     * Record a gateway response for health tracking
     *
     * @param host - Gateway hostname
     * @param responseTime - Response time in milliseconds
     * @param success - Whether the check was successful
     */
    private recordGatewayResponse(host: string, responseTime: number, success: boolean): void {
        if (!this.healthData.has(host)) {
            this.healthData.set(host, []);
        }

        const records = this.healthData.get(host)!;
        records.push({
            responseTime,
            success,
            timestamp: Date.now(),
        });

        // Keep only the most recent records
        if (records.length > this.MAX_HEALTH_RECORDS) {
            records.shift();
        }
    }

    /**
     * Get health statistics for a specific gateway
     *
     * @param host - Gateway hostname
     * @returns Health statistics for the gateway, or undefined if not tracked
     */
    getGatewayHealth(host: string): GatewayHealthStats | undefined {
        const gateway = this.gateways.find(g => g.host === host);
        if (!gateway) {
            return undefined;
        }

        const records = this.healthData.get(host) || [];
        const originalPriority = this.originalPriorities.get(host) ?? gateway.priority;

        if (records.length === 0) {
            return {
                host,
                priority: gateway.priority,
                originalPriority,
                successCount: 0,
                failureCount: 0,
                totalChecks: 0,
                successRate: 0,
                averageResponseTime: 0,
                lastSuccess: null,
                lastFailure: null,
                isHealthy: true, // Assume healthy until we have data
            };
        }

        const successCount = records.filter(r => r.success).length;
        const failureCount = records.filter(r => !r.success).length;
        const successRate = successCount / records.length;
        const averageResponseTime = Math.round(
            records.reduce((sum, r) => sum + r.responseTime, 0) / records.length
        );
        const lastSuccess = records.filter(r => r.success).pop()?.timestamp ?? null;
        const lastFailure = records.filter(r => !r.success).pop()?.timestamp ?? null;

        // Consider healthy if success rate is >= 50% or no failures yet
        const isHealthy = successRate >= 0.5;

        return {
            host,
            priority: gateway.priority,
            originalPriority,
            successCount,
            failureCount,
            totalChecks: records.length,
            successRate,
            averageResponseTime,
            lastSuccess,
            lastFailure,
            isHealthy,
        };
    }

    /**
     * Get health statistics for all gateways
     *
     * @returns Array of health statistics for each gateway
     */
    getAllGatewayHealth(): GatewayHealthStats[] {
        return this.gateways.map(g => this.getGatewayHealth(g.host)!);
    }

    /**
     * Adjust gateway priorities based on health data
     *
     * This method reorders gateways based on:
     * 1. Health status (healthy gateways first)
     * 2. Average response time (faster gateways first among healthy)
     * 3. Success rate (higher success rate first)
     *
     * @param options - Options for priority adjustment
     * @returns The new gateway order after adjustment
     */
    adjustGatewayPriorities(options?: {
        /** Minimum number of checks required before adjusting (default: 3) */
        minChecks?: number;
        /** Threshold for considering a gateway healthy (default: 0.5) */
        healthyThreshold?: number;
    }): GatewayConfig[] {
        const minChecks = options?.minChecks ?? 3;
        const healthyThreshold = options?.healthyThreshold ?? 0.5;

        // Get health stats for all gateways
        const healthStats = this.getAllGatewayHealth();

        // Check if we have enough data to make adjustments
        const totalChecks = healthStats.reduce((sum, h) => sum + h.totalChecks, 0);
        if (totalChecks < minChecks) {
            this.logger.debug('Not enough health data to adjust priorities', {
                totalChecks,
                required: minChecks,
            });
            return [...this.gateways];
        }

        // Sort gateways based on health metrics (with stable sort using original index)
        const indexedGateways = this.gateways.map((g, index) => ({ gateway: g, originalIndex: index }));

        indexedGateways.sort((a, b) => {
            const healthA = this.getGatewayHealth(a.gateway.host)!;
            const healthB = this.getGatewayHealth(b.gateway.host)!;

            // First: unhealthy gateways go to the end
            const aHealthy = healthA.successRate >= healthyThreshold || healthA.totalChecks === 0;
            const bHealthy = healthB.successRate >= healthyThreshold || healthB.totalChecks === 0;

            if (aHealthy && !bHealthy) return -1;
            if (!aHealthy && bHealthy) return 1;

            // Second: faster response time wins (among healthy or equally unhealthy)
            if (healthA.totalChecks > 0 && healthB.totalChecks > 0) {
                const timeDiff = healthA.averageResponseTime - healthB.averageResponseTime;
                if (Math.abs(timeDiff) > 100) { // Only consider significant differences (>100ms)
                    return timeDiff;
                }
            }

            // Third: higher success rate wins
            if (healthA.totalChecks > 0 && healthB.totalChecks > 0) {
                const rateDiff = healthB.successRate - healthA.successRate;
                if (Math.abs(rateDiff) > 0.1) { // Only consider significant differences (>10%)
                    return rateDiff;
                }
            }

            // Keep original order if no significant difference (stable sort)
            return a.originalIndex - b.originalIndex;
        });

        const sortedGateways = indexedGateways.map(item => item.gateway);

        // Update priorities based on new order (preserve original priority range)
        const minPriority = Math.min(...Array.from(this.originalPriorities.values()));
        sortedGateways.forEach((gateway, index) => {
            gateway.priority = minPriority + index;
        });

        // Re-sort the main gateways array
        this.gateways = sortedGateways;

        this.logger.info('Gateway priorities adjusted', {
            newOrder: this.gateways.map(g => ({
                host: g.host,
                priority: g.priority,
                health: this.getGatewayHealth(g.host),
            })),
        });

        return [...this.gateways];
    }

    /**
     * Run a health check on all gateways
     *
     * Tests each gateway by making a HEAD request to a known transaction.
     * Optionally adjusts priorities based on results.
     *
     * @param options - Health check options
     * @returns Health check results
     *
     * @example
     * ```ts
     * const result = await arweaveGatewayManager.runHealthCheck({
     *     adjustPriorities: true,
     * });
     * console.log(`Fastest gateway: ${result.fastestGateway}`);
     * console.log(`Healthy gateways: ${result.healthyGateways.join(', ')}`);
     * ```
     */
    async runHealthCheck(options?: HealthCheckOptions): Promise<HealthCheckResult> {
        const startTime = Date.now();
        const txId = options?.txId ?? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk012345'; // Default test txId
        const healthyThreshold = options?.healthyThreshold ?? 0.5;
        const fastThreshold = options?.fastThreshold ?? 2000;

        this.logger.info('Starting gateway health check', {
            txId,
            gateways: this.gateways.map(g => g.host),
        });

        // Check each gateway in parallel
        const checkPromises = this.gateways.map(async (gateway) => {
            const checkStart = Date.now();
            let success = false;
            let responseTime = this.timeout; // Default to timeout on failure

            try {
                const url = constructGatewayUrl(txId, gateway);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    method: 'HEAD',
                    mode: 'cors',
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                responseTime = Date.now() - checkStart;
                success = response.ok || (response.status >= 200 && response.status < 400);
            } catch (error) {
                responseTime = Date.now() - checkStart;
                success = false;
            }

            // Record the result
            this.recordGatewayResponse(gateway.host, responseTime, success);

            return {
                host: gateway.host,
                success,
                responseTime,
            };
        });

        const results = await Promise.all(checkPromises);

        // Build health stats
        const gatewayStats = this.getAllGatewayHealth();

        // Determine healthy/unhealthy gateways
        const healthyGateways: string[] = [];
        const unhealthyGateways: string[] = [];
        let fastestGateway: string | null = null;
        let fastestTime = Infinity;

        for (const result of results) {
            const stats = gatewayStats.find(s => s.host === result.host)!;

            if (result.success && result.responseTime < fastestTime) {
                fastestTime = result.responseTime;
                fastestGateway = result.host;
            }

            if (stats.successRate >= healthyThreshold || stats.totalChecks === 1) {
                // First check or healthy threshold met
                if (result.success) {
                    healthyGateways.push(result.host);
                } else {
                    unhealthyGateways.push(result.host);
                }
            } else {
                unhealthyGateways.push(result.host);
            }
        }

        const totalTime = Date.now() - startTime;

        // Optionally adjust priorities
        if (options?.adjustPriorities) {
            this.adjustGatewayPriorities({
                minChecks: options.minChecksForAdjustment ?? 1,
                healthyThreshold,
            });
        }

        const healthCheckResult: HealthCheckResult = {
            timestamp: startTime,
            gateways: gatewayStats,
            healthyGateways,
            unhealthyGateways,
            fastestGateway,
            totalTime,
        };

        this.logger.info('Health check complete', {
            healthyGateways,
            unhealthyGateways,
            fastestGateway,
            totalTime,
        });

        return healthCheckResult;
    }

    /**
     * Reset gateway priorities to their original values
     */
    resetGatewayPriorities(): void {
        // Reset each gateway's priority to its original value
        this.gateways.forEach(gateway => {
            const original = this.originalPriorities.get(gateway.host);
            if (original !== undefined) {
                gateway.priority = original;
            }
        });

        // Re-sort by original priorities
        this.gateways.sort((a, b) => {
            const aOriginal = this.originalPriorities.get(a.host) ?? a.priority;
            const bOriginal = this.originalPriorities.get(b.host) ?? b.priority;
            return aOriginal - bOriginal;
        });

        this.logger.info('Gateway priorities reset to original values', {
            gateways: this.gateways.map(g => ({ host: g.host, priority: g.priority })),
        });
    }

    /**
     * Clear all health tracking data
     */
    clearHealthData(): void {
        this.healthData.clear();
        this.logger.info('Health data cleared');
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
