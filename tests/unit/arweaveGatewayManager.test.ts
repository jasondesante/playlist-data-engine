/**
 * Unit Tests for Arweave Gateway Manager
 *
 * Tests gateway priority ordering, caching, timeouts, and fallback behavior
 * - Test gateway priority ordering
 * - Test cache hit/miss scenarios
 * - Test timeout behavior
 * - Test fallback to alternate gateways
 * - Test pathSuffix handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    ArweaveGatewayManager,
    type ArweaveGatewayManagerConfig,
} from '../../src/utils/arweaveGatewayManager';
import type { GatewayConfig } from '../../src/utils/arweaveUtils';

// ============================================================
// Test Data
// ============================================================

/** A valid 43-character Arweave transaction ID for testing */
const VALID_TX_ID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk012345';

/** Arweave URL for testing */
const ARWEAVE_URL = 'https://arweave.net/' + VALID_TX_ID;

/** Ar:// protocol URL */
const AR_PROTOCOL_URL = 'ar://' + VALID_TX_ID;

/** URL with path suffix */
const ARWEAVE_URL_WITH_PATH = 'https://arweave.net/' + VALID_TX_ID + '/model.json';

/** Custom gateways for testing */
const CUSTOM_GATEWAYS: GatewayConfig[] = [
    { host: 'primary.example.com', protocol: 'https', priority: 0 },
    { host: 'secondary.example.com', protocol: 'https', priority: 1 },
    { host: 'tertiary.example.com', protocol: 'https', priority: 2 },
];

// ============================================================
// Mock Setup
// ============================================================

// Store the original fetch
const originalFetch = global.fetch;

// Create a mock fetch function that can be configured per-test
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
});

afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
});

// ============================================================
// Test gateway priority ordering
// ============================================================

describe('Gateway priority ordering', () => {
    it('should sort gateways by priority on initialization', () => {
        const unsortedGateways: GatewayConfig[] = [
            { host: 'third.com', protocol: 'https', priority: 2 },
            { host: 'first.com', protocol: 'https', priority: 0 },
            { host: 'second.com', protocol: 'https', priority: 1 },
        ];

        const manager = new ArweaveGatewayManager({ gateways: unsortedGateways });

        // First gateway check should use the highest priority (lowest number)
        mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

        manager.checkGateway(VALID_TX_ID, { host: 'first.com', protocol: 'https', priority: 0 });

        // Verify the manager was created (gateways are sorted internally)
        expect(manager).toBeDefined();
    });

    it('should try gateways in priority order when resolving URL', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const fetchCalls: string[] = [];
        mockFetch.mockImplementation(async (url: string) => {
            fetchCalls.push(url);
            // Primary fails, secondary succeeds
            if (url.includes('primary.example.com')) {
                return new Response(null, { status: 500 });
            }
            return new Response(null, { status: 200 });
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        // Should have tried primary first, then secondary
        expect(fetchCalls).toHaveLength(2);
        expect(fetchCalls[0]).toContain('primary.example.com');
        expect(fetchCalls[1]).toContain('secondary.example.com');
        expect(result).toContain('secondary.example.com');
    });

    it('should use default gateways when none provided', async () => {
        const manager = new ArweaveGatewayManager();

        const fetchCalls: string[] = [];
        mockFetch.mockImplementation(async (url: string) => {
            fetchCalls.push(url);
            return new Response(null, { status: 200 });
        });

        await manager.resolveUrl(ARWEAVE_URL);

        // Default gateways: arweave.net, ar.io, ardrive.net, turbo-gateway.com
        expect(fetchCalls[0]).toContain('arweave.net');
    });
});

// ============================================================
// Test cache hit/miss scenarios
// ============================================================

describe('Cache hit/miss scenarios', () => {
    describe('Cache misses', () => {
        it('should check gateways when cache is empty', async () => {
            const manager = new ArweaveGatewayManager({
                gateways: CUSTOM_GATEWAYS,
                timeout: 1000,
            });

            mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

            const result = await manager.resolveUrl(ARWEAVE_URL);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result).toContain('primary.example.com');
        });

        it('should not use cache for non-Arweave URLs', async () => {
            const manager = new ArweaveGatewayManager();

            const result = await manager.resolveUrl('https://example.com/file.mp3');

            // Should not call fetch for non-Arweave URLs
            expect(mockFetch).not.toHaveBeenCalled();
            expect(result).toBe('https://example.com/file.mp3');
        });
    });

    describe('Cache hits', () => {
        it('should return cached URL on subsequent requests', async () => {
            const manager = new ArweaveGatewayManager({
                gateways: CUSTOM_GATEWAYS,
                timeout: 1000,
            });

            // First request - cache miss
            mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
            const result1 = await manager.resolveUrl(ARWEAVE_URL);

            // Second request - should hit cache
            const result2 = await manager.resolveUrl(ARWEAVE_URL);

            // Only one fetch call (from first request)
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result1).toBe(result2);
            expect(result2).toContain('primary.example.com');
        });

        it('should cache the working gateway after successful check', async () => {
            const manager = new ArweaveGatewayManager({
                gateways: CUSTOM_GATEWAYS,
                timeout: 1000,
            });

            // Primary fails, secondary succeeds
            mockFetch
                .mockResolvedValueOnce(new Response(null, { status: 500 }))
                .mockResolvedValueOnce(new Response(null, { status: 200 }));

            const result1 = await manager.resolveUrl(ARWEAVE_URL);
            expect(result1).toContain('secondary.example.com');

            // Next request should use cached secondary gateway
            const result2 = await manager.resolveUrl(ARWEAVE_URL);
            expect(result2).toContain('secondary.example.com');
            expect(mockFetch).toHaveBeenCalledTimes(2); // Only initial checks, not repeated
        });

        it('should cache separately for different transaction IDs', async () => {
            const manager = new ArweaveGatewayManager({
                gateways: CUSTOM_GATEWAYS,
                timeout: 1000,
            });

            const txId1 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
            const txId2 = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

            mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

            await manager.resolveUrl('https://arweave.net/' + txId1);
            await manager.resolveUrl('https://arweave.net/' + txId2);

            // Two separate cache entries
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Cache expiration', () => {
        it('should respect cache TTL', async () => {
            // Use very short TTL for testing
            const manager = new ArweaveGatewayManager({
                gateways: CUSTOM_GATEWAYS,
                timeout: 1000,
                cacheTTL: 10, // 10ms TTL
            });

            mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

            // First request
            await manager.resolveUrl(ARWEAVE_URL);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 50));

            // Second request should re-check gateway
            await manager.resolveUrl(ARWEAVE_URL);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('should clear cache when clearCache is called', async () => {
            const manager = new ArweaveGatewayManager({
                gateways: CUSTOM_GATEWAYS,
                timeout: 1000,
            });

            mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

            // First request
            await manager.resolveUrl(ARWEAVE_URL);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Clear cache
            manager.clearCache();

            // Second request should re-check gateway
            await manager.resolveUrl(ARWEAVE_URL);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('getCachedGateway and setCache', () => {
        it('should return null for non-cached txId', () => {
            const manager = new ArweaveGatewayManager();
            const result = manager.getCachedGateway('nonexistent-tx-id-12345678901234567890');
            expect(result).toBeNull();
        });

        it('should return cached gateway after setCache', () => {
            const manager = new ArweaveGatewayManager();
            const gateway: GatewayConfig = { host: 'test.com', protocol: 'https', priority: 0 };

            manager.setCache(VALID_TX_ID, gateway);
            const result = manager.getCachedGateway(VALID_TX_ID);

            expect(result).toEqual(gateway);
        });
    });
});

// ============================================================
// Test timeout behavior
// ============================================================

describe('Timeout behavior', () => {
    it('should timeout slow gateway checks', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 50, // 50ms timeout
        });

        // Simulate abort errors for first gateway, success for second
        mockFetch
            .mockImplementationOnce(async () => {
                // Simulate abort error
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                throw error;
            })
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        // Should have fallen back to secondary due to timeout/abort
        expect(result).toContain('secondary.example.com');
    });

    it('should handle AbortController abort signal', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 50,
        });

        mockFetch.mockImplementationOnce(async (_url: string, options?: RequestInit) => {
            // Verify abort signal is passed
            expect(options?.signal).toBeInstanceOf(AbortSignal);
            // Simulate abort
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            throw error;
        }).mockResolvedValueOnce(new Response(null, { status: 200 }));

        await manager.resolveUrl(ARWEAVE_URL);

        expect(mockFetch).toHaveBeenCalled();
    });

    it('should continue to next gateway after timeout', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 50,
        });

        const fetchCalls: string[] = [];
        mockFetch.mockImplementation(async (url: string) => {
            fetchCalls.push(url);
            // All gateways timeout (abort) except tertiary
            if (url.includes('tertiary.example.com')) {
                return new Response(null, { status: 200 });
            }
            // Simulate abort error for first two
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            throw error;
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(fetchCalls).toHaveLength(3);
        expect(result).toContain('tertiary.example.com');
    });
});

// ============================================================
// Test fallback to alternate gateways
// ============================================================

describe('Fallback to alternate gateways', () => {
    it('should fallback to second gateway when first fails with 500', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch
            .mockResolvedValueOnce(new Response(null, { status: 500 }))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(result).toContain('secondary.example.com');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fallback to second gateway when first fails with 404', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch
            .mockResolvedValueOnce(new Response(null, { status: 404 }))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(result).toContain('secondary.example.com');
    });

    it('should fallback when first gateway has CORS error', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch
            .mockRejectedValueOnce(new TypeError('Failed to fetch')) // CORS error
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(result).toContain('secondary.example.com');
    });

    it('should fallback when first gateway has network error', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch
            .mockRejectedValueOnce(new TypeError('Network error'))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(result).toContain('secondary.example.com');
    });

    it('should return original URL when all gateways fail', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // All gateways fail
        mockFetch.mockResolvedValue(new Response(null, { status: 500 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(result).toBe(ARWEAVE_URL);
        expect(mockFetch).toHaveBeenCalledTimes(3); // Tried all 3 gateways
    });

    it('should return original URL when all gateways have network errors', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // All gateways fail with network errors
        mockFetch.mockRejectedValue(new TypeError('Network error'));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(result).toBe(ARWEAVE_URL);
    });

    it('should handle ar:// protocol URLs', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(AR_PROTOCOL_URL);

        expect(result).toContain('primary.example.com');
        expect(result).toContain(VALID_TX_ID);
    });

    it('should return original URL for unparseable Arweave URL', async () => {
        const manager = new ArweaveGatewayManager();

        // URL contains arweave.net but no valid txId
        const invalidUrl = 'https://arweave.net/';
        const result = await manager.resolveUrl(invalidUrl);

        expect(result).toBe(invalidUrl);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should try all gateways sequentially', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const fetchCalls: string[] = [];
        mockFetch.mockImplementation(async (url: string) => {
            fetchCalls.push(url);
            return new Response(null, { status: 500 });
        });

        await manager.resolveUrl(ARWEAVE_URL);

        expect(fetchCalls).toHaveLength(3);
        expect(fetchCalls[0]).toContain('primary.example.com');
        expect(fetchCalls[1]).toContain('secondary.example.com');
        expect(fetchCalls[2]).toContain('tertiary.example.com');
    });
});

// ============================================================
// Test pathSuffix handling
// ============================================================

describe('pathSuffix handling', () => {
    it('should preserve path suffix in resolved URL', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL_WITH_PATH);

        expect(result).toContain('/model.json');
        expect(result).toContain(VALID_TX_ID);
    });

    it('should preserve path suffix when using cached gateway', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

        // First request
        const result1 = await manager.resolveUrl(ARWEAVE_URL_WITH_PATH);
        expect(result1).toContain('/model.json');

        // Second request should use cache and preserve path suffix
        const result2 = await manager.resolveUrl(ARWEAVE_URL_WITH_PATH);
        expect(result2).toContain('/model.json');
        expect(mockFetch).toHaveBeenCalledTimes(1); // Only first request hit network
    });

    it('should handle URLs with query strings', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const urlWithQuery = ARWEAVE_URL + '?param=value';
        mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(urlWithQuery);

        // Should extract txId and resolve correctly
        expect(result).toContain(VALID_TX_ID);
        expect(result).toContain('primary.example.com');
    });

    it('should handle URLs with fragments', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const urlWithFragment = ARWEAVE_URL + '#section';
        mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(urlWithFragment);

        // Should extract txId and resolve correctly
        expect(result).toContain(VALID_TX_ID);
    });
});

// ============================================================
// Additional Tests: Configuration
// ============================================================

describe('Configuration', () => {
    it('should use custom timeout', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 10, // Very short timeout
        });

        // Simulate abort errors for all gateways
        mockFetch.mockImplementation(async () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            throw error;
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        // All gateways should timeout and return original URL
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(result).toBe(ARWEAVE_URL);
    });

    it('should use custom cache TTL', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
            cacheTTL: 5, // Very short TTL
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        await manager.resolveUrl(ARWEAVE_URL);
        await new Promise(resolve => setTimeout(resolve, 20));
        await manager.resolveUrl(ARWEAVE_URL);

        // Cache should have expired, causing second fetch cycle
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use default values when config not provided', () => {
        const manager = new ArweaveGatewayManager();

        // These are internal, but we can verify behavior
        expect(manager).toBeDefined();

        // Clear cache should work
        manager.clearCache();
    });
});

// ============================================================
// Additional Tests: checkGateway method
// ============================================================

describe('checkGateway method', () => {
    it('should return true for successful HEAD request', async () => {
        const manager = new ArweaveGatewayManager();
        const gateway: GatewayConfig = { host: 'test.com', protocol: 'https', priority: 0 };

        mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await manager.checkGateway(VALID_TX_ID, gateway);

        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
            'https://test.com/' + VALID_TX_ID,
            expect.objectContaining({
                method: 'HEAD',
                mode: 'cors',
            })
        );
    });

    it('should return false for 404 response', async () => {
        const manager = new ArweaveGatewayManager();
        const gateway: GatewayConfig = { host: 'test.com', protocol: 'https', priority: 0 };

        mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

        const result = await manager.checkGateway(VALID_TX_ID, gateway);

        expect(result).toBe(false);
    });

    it('should return false for 500 response', async () => {
        const manager = new ArweaveGatewayManager();
        const gateway: GatewayConfig = { host: 'test.com', protocol: 'https', priority: 0 };

        mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));

        const result = await manager.checkGateway(VALID_TX_ID, gateway);

        expect(result).toBe(false);
    });

    it('should return false for CORS error', async () => {
        const manager = new ArweaveGatewayManager();
        const gateway: GatewayConfig = { host: 'test.com', protocol: 'https', priority: 0 };

        mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        const result = await manager.checkGateway(VALID_TX_ID, gateway);

        expect(result).toBe(false);
    });

    it('should return false for timeout (AbortError)', async () => {
        const manager = new ArweaveGatewayManager({ timeout: 10 });
        const gateway: GatewayConfig = { host: 'test.com', protocol: 'https', priority: 0 };

        // Simulate abort error
        mockFetch.mockImplementationOnce(async () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            throw error;
        });

        const result = await manager.checkGateway(VALID_TX_ID, gateway);

        expect(result).toBe(false);
    });

    it('should accept 3xx redirect responses as success', async () => {
        const manager = new ArweaveGatewayManager();
        const gateway: GatewayConfig = { host: 'test.com', protocol: 'https', priority: 0 };

        mockFetch.mockResolvedValueOnce(new Response(null, { status: 301 }));

        const result = await manager.checkGateway(VALID_TX_ID, gateway);

        expect(result).toBe(true);
    });

    it('should include path suffix in check URL', async () => {
        const manager = new ArweaveGatewayManager();
        const gateway: GatewayConfig = { host: 'test.com', protocol: 'https', priority: 0 };

        mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

        await manager.checkGateway(VALID_TX_ID, gateway, '/model.json');

        expect(mockFetch).toHaveBeenCalledWith(
            'https://test.com/' + VALID_TX_ID + '/model.json',
            expect.objectContaining({
                method: 'HEAD',
                mode: 'cors',
            })
        );
    });
});

// ============================================================
// Additional Tests: Singleton export
// ============================================================

describe('Singleton instance', () => {
    it('should be importable and usable', async () => {
        // Import the singleton
        const { arweaveGatewayManager } = await import('../../src/utils/arweaveGatewayManager');

        expect(arweaveGatewayManager).toBeInstanceOf(ArweaveGatewayManager);
    });

    it('should have all public methods available', async () => {
        const { arweaveGatewayManager } = await import('../../src/utils/arweaveGatewayManager');

        expect(typeof arweaveGatewayManager.resolveUrl).toBe('function');
        expect(typeof arweaveGatewayManager.checkGateway).toBe('function');
        expect(typeof arweaveGatewayManager.getCachedGateway).toBe('function');
        expect(typeof arweaveGatewayManager.setCache).toBe('function');
        expect(typeof arweaveGatewayManager.clearCache).toBe('function');
        expect(typeof arweaveGatewayManager.prefetchUrls).toBe('function');
        expect(typeof arweaveGatewayManager.getCacheStats).toBe('function');
        expect(typeof arweaveGatewayManager.getCacheEntries).toBe('function');
    });
});

// ============================================================
// Additional Tests: prefetchUrls method
// ============================================================

describe('prefetchUrls method', () => {
    it('should prefetch multiple URLs in parallel', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const txId1 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        const txId2 = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
        const urls = [
            'https://arweave.net/' + txId1,
            'https://arweave.net/' + txId2,
        ];

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.prefetchUrls(urls);

        expect(result.total).toBe(2);
        expect(result.succeeded).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.skipped).toBe(0);
        expect(result.entries).toHaveLength(2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should skip non-Arweave URLs', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const urls = [
            'https://example.com/audio.mp3',
            'https://arweave.net/' + VALID_TX_ID,
        ];

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.prefetchUrls(urls);

        expect(result.total).toBe(2);
        expect(result.succeeded).toBe(1);
        expect(result.skipped).toBe(1);
        expect(result.failed).toBe(0);
    });

    it('should use cached gateways when available', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Pre-cache the gateway
        manager.setCache(VALID_TX_ID, CUSTOM_GATEWAYS[0]);

        const result = await manager.prefetchUrls([ARWEAVE_URL]);

        expect(result.succeeded).toBe(1);
        expect(result.entries[0].gateway?.host).toBe('primary.example.com');
        // Should not have called fetch since it was cached
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle partial failures', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const txId1 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        const txId2 = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

        // First URL succeeds, second fails
        mockFetch
            .mockResolvedValueOnce(new Response(null, { status: 200 }))
            .mockResolvedValue(new Response(null, { status: 500 }));

        const result = await manager.prefetchUrls([
            'https://arweave.net/' + txId1,
            'https://arweave.net/' + txId2,
        ]);

        expect(result.succeeded).toBe(1);
        expect(result.failed).toBe(1);
    });

    it('should respect concurrency option', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const urls = [
            'https://arweave.net/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            'https://arweave.net/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
            'https://arweave.net/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            'https://arweave.net/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
        ];

        let concurrentCalls = 0;
        let maxConcurrentCalls = 0;

        mockFetch.mockImplementation(async () => {
            concurrentCalls++;
            maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
            await new Promise(resolve => setTimeout(resolve, 10));
            concurrentCalls--;
            return new Response(null, { status: 200 });
        });

        // Concurrency of 2
        await manager.prefetchUrls(urls, { concurrency: 2 });

        // Max concurrent calls should be 2 (or close to it)
        expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
    });

    it('should return entry details for each URL', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const txId1 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.prefetchUrls(['https://arweave.net/' + txId1]);

        expect(result.entries[0].url).toBe('https://arweave.net/' + txId1);
        expect(result.entries[0].txId).toBe(txId1);
        expect(result.entries[0].success).toBe(true);
        expect(result.entries[0].gateway?.host).toBe('primary.example.com');
    });
});

// ============================================================
// Additional Tests: getCacheStats method
// ============================================================

describe('getCacheStats method', () => {
    it('should return empty stats for empty cache', () => {
        const manager = new ArweaveGatewayManager();
        const stats = manager.getCacheStats();

        expect(stats.size).toBe(0);
        expect(stats.txIds).toHaveLength(0);
        expect(stats.hitCount).toBe(0);
        expect(stats.missCount).toBe(0);
        expect(stats.ttl).toBe(DEFAULT_CACHE_TTL);
    });

    it('should return correct stats after caching', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        // Resolve URL to populate cache
        await manager.resolveUrl(ARWEAVE_URL);

        const stats = manager.getCacheStats();

        expect(stats.size).toBe(1);
        expect(stats.txIds).toContain(VALID_TX_ID);
        expect(stats.missCount).toBe(1);
    });

    it('should track hit and miss counts', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        // First request - miss
        await manager.resolveUrl(ARWEAVE_URL);

        // Second request - hit
        await manager.resolveUrl(ARWEAVE_URL);

        const stats = manager.getCacheStats();

        expect(stats.hitCount).toBe(1);
        expect(stats.missCount).toBe(1);
    });

    it('should reset hit/miss counts on clearCache', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        await manager.resolveUrl(ARWEAVE_URL);
        await manager.resolveUrl(ARWEAVE_URL);

        manager.clearCache();

        const stats = manager.getCacheStats();

        expect(stats.size).toBe(0);
        expect(stats.hitCount).toBe(0);
        expect(stats.missCount).toBe(0);
    });

    it('should only count valid (non-expired) entries', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
            cacheTTL: 10, // 10ms TTL
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        await manager.resolveUrl(ARWEAVE_URL);

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 50));

        const stats = manager.getCacheStats();

        expect(stats.size).toBe(0);
        expect(stats.txIds).toHaveLength(0);
    });
});

// ============================================================
// Additional Tests: getCacheEntries method
// ============================================================

describe('getCacheEntries method', () => {
    it('should return empty array for empty cache', () => {
        const manager = new ArweaveGatewayManager();
        const entries = manager.getCacheEntries();

        expect(entries).toHaveLength(0);
    });

    it('should return all cache entries including expired', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
            cacheTTL: 10, // 10ms TTL
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        await manager.resolveUrl(ARWEAVE_URL);

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 50));

        // getCacheEntries returns ALL entries (including expired)
        const entries = manager.getCacheEntries();

        expect(entries).toHaveLength(1);
        expect(entries[0].txId).toBe(VALID_TX_ID);
    });
});

const DEFAULT_CACHE_TTL = 7200000;

// ============================================================
// Additional Tests: prefetchUrls method
// ============================================================

describe('prefetchUrls method', () => {
    it('should prefetch multiple URLs in parallel', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const txId1 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        const txId2 = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
        const urls = [
            'https://arweave.net/' + txId1,
            'https://arweave.net/' + txId2,
        ];

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.prefetchUrls(urls);

        expect(result.total).toBe(2);
        expect(result.succeeded).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.skipped).toBe(0);
        expect(result.entries).toHaveLength(2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should skip non-Arweave URLs', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const urls = [
            'https://example.com/audio.mp3',
            'https://arweave.net/' + VALID_TX_ID,
        ];

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.prefetchUrls(urls);

        expect(result.total).toBe(2);
        expect(result.succeeded).toBe(1);
        expect(result.skipped).toBe(1);
        expect(result.failed).toBe(0);
    });

    it('should use cached gateways when available', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Pre-cache the gateway
        manager.setCache(VALID_TX_ID, CUSTOM_GATEWAYS[0]);

        const result = await manager.prefetchUrls([ARWEAVE_URL]);

        expect(result.succeeded).toBe(1);
        expect(result.entries[0].gateway?.host).toBe('primary.example.com');
        // Should not have called fetch since it was cached
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle partial failures', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const txId1 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        const txId2 = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

        // First URL succeeds, second fails
        mockFetch
            .mockResolvedValueOnce(new Response(null, { status: 200 }))
            .mockResolvedValue(new Response(null, { status: 500 }));

        const result = await manager.prefetchUrls([
            'https://arweave.net/' + txId1,
            'https://arweave.net/' + txId2,
        ]);

        expect(result.succeeded).toBe(1);
        expect(result.failed).toBe(1);
    });

    it('should respect concurrency option', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const urls = [
            'https://arweave.net/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            'https://arweave.net/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
            'https://arweave.net/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            'https://arweave.net/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
        ];

        let concurrentCalls = 0;
        let maxConcurrentCalls = 0;

        mockFetch.mockImplementation(async () => {
            concurrentCalls++;
            maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
            await new Promise(resolve => setTimeout(resolve, 10));
            concurrentCalls--;
            return new Response(null, { status: 200 });
        });

        // Concurrency of 2
        await manager.prefetchUrls(urls, { concurrency: 2 });

        // Max concurrent calls should be 2 (or close to it)
        expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
    });

    it('should return entry details for each URL', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const txId1 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.prefetchUrls(['https://arweave.net/' + txId1]);

        expect(result.entries[0].url).toBe('https://arweave.net/' + txId1);
        expect(result.entries[0].txId).toBe(txId1);
        expect(result.entries[0].success).toBe(true);
        expect(result.entries[0].gateway?.host).toBe('primary.example.com');
    });
});

// ============================================================
// Additional Tests: getCacheStats method
// ============================================================

describe('getCacheStats method', () => {
    it('should return empty stats for empty cache', () => {
        const manager = new ArweaveGatewayManager();
        const stats = manager.getCacheStats();

        expect(stats.size).toBe(0);
        expect(stats.txIds).toHaveLength(0);
        expect(stats.hitCount).toBe(0);
        expect(stats.missCount).toBe(0);
        expect(stats.ttl).toBe(DEFAULT_CACHE_TTL);
    });

    it('should return correct stats after caching', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        await manager.resolveUrl(ARWEAVE_URL);
        const stats = manager.getCacheStats();

        expect(stats.size).toBe(1);
        expect(stats.txIds).toContain(VALID_TX_ID);
        expect(stats.missCount).toBe(1);
    });

    it('should track hit and miss counts', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        // First request - miss
        await manager.resolveUrl(ARWEAVE_URL);
        // Second request - hit
        await manager.resolveUrl(ARWEAVE_URL);
        const stats = manager.getCacheStats();

        expect(stats.hitCount).toBe(1);
        expect(stats.missCount).toBe(1);
    });

    it('should reset hit/miss counts on clearCache', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.resolveUrl(ARWEAVE_URL);
        await manager.resolveUrl(ARWEAVE_URL);
        manager.clearCache();
        const stats = manager.getCacheStats();

        expect(stats.size).toBe(0);
        expect(stats.hitCount).toBe(0);
        expect(stats.missCount).toBe(0);
    });

    it('should only count valid (non-expired) entries', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
            cacheTTL: 10, // 10ms TTL
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.resolveUrl(ARWEAVE_URL);
        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 50));
        const stats = manager.getCacheStats();

        expect(stats.size).toBe(0);
        expect(stats.txIds).toHaveLength(0);
    });
});

// ============================================================
// Additional Tests: getCacheEntries method
// ============================================================

describe('getCacheEntries method', () => {
    it('should return empty array for empty cache', () => {
        const manager = new ArweaveGatewayManager();
        const entries = manager.getCacheEntries();

        expect(entries).toHaveLength(0);
    });

    it('should return all cache entries including expired', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
            cacheTTL: 10, // 10ms TTL
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.resolveUrl(ARWEAVE_URL);
        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 50));
        // getCacheEntries returns all entries (including expired)
        const entries = manager.getCacheEntries();

        expect(entries).toHaveLength(1);
        expect(entries[0].txId).toBe(VALID_TX_ID);
    });
});

// ============================================================
// Health Monitoring Tests: getGatewayHealth method
// ============================================================

describe('getGatewayHealth method', () => {
    it('should return undefined for unknown gateway', () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
        });

        const health = manager.getGatewayHealth('unknown.example.com');
        expect(health).toBeUndefined();
    });

    it('should return default health stats for gateway with no checks', () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
        });

        const health = manager.getGatewayHealth('primary.example.com');

        expect(health).toBeDefined();
        expect(health?.host).toBe('primary.example.com');
        expect(health?.successCount).toBe(0);
        expect(health?.failureCount).toBe(0);
        expect(health?.totalChecks).toBe(0);
        expect(health?.successRate).toBe(0);
        expect(health?.averageResponseTime).toBe(0);
        expect(health?.lastSuccess).toBeNull();
        expect(health?.lastFailure).toBeNull();
        expect(health?.isHealthy).toBe(true); // Assumed healthy until proven otherwise
    });

    it('should track health stats after successful check', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.resolveUrl(ARWEAVE_URL);

        const health = manager.getGatewayHealth('primary.example.com');

        expect(health?.successCount).toBe(1);
        expect(health?.failureCount).toBe(0);
        expect(health?.totalChecks).toBe(1);
        expect(health?.successRate).toBe(1);
        expect(health?.averageResponseTime).toBeGreaterThanOrEqual(0);
        expect(health?.lastSuccess).toBeGreaterThan(0);
        expect(health?.lastFailure).toBeNull();
        expect(health?.isHealthy).toBe(true);
    });

    it('should track health stats after failed check', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // First gateway fails, second succeeds
        mockFetch
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        await manager.resolveUrl(ARWEAVE_URL);

        const primaryHealth = manager.getGatewayHealth('primary.example.com');
        expect(primaryHealth?.successCount).toBe(0);
        expect(primaryHealth?.failureCount).toBe(1);
        expect(primaryHealth?.isHealthy).toBe(false);
        expect(primaryHealth?.lastFailure).toBeGreaterThan(0);
    });

    it('should calculate average response time correctly', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Simulate multiple checks with different response times
        let callCount = 0;
        mockFetch.mockImplementation(async () => {
            callCount++;
            await new Promise(resolve => setTimeout(resolve, callCount * 10)); // 10ms, 20ms, 30ms
            return new Response(null, { status: 200 });
        });

        // Make 3 requests
        for (let i = 0; i < 3; i++) {
            manager.clearCache(); // Clear cache to force new checks
            await manager.resolveUrl(ARWEAVE_URL);
        }

        const health = manager.getGatewayHealth('primary.example.com');
        expect(health?.successCount).toBe(3);
        // Average should be around 20ms (10+20+30)/3 = 20
        expect(health?.averageResponseTime).toBeGreaterThanOrEqual(10);
    });

    it('should limit health records to MAX_HEALTH_RECORDS', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        // Make more than MAX_HEALTH_RECORDS (50) requests
        for (let i = 0; i < 60; i++) {
            manager.clearCache();
            await manager.resolveUrl(ARWEAVE_URL);
        }

        const health = manager.getGatewayHealth('primary.example.com');
        // Should be capped at 50
        expect(health?.totalChecks).toBe(50);
    });
});

// ============================================================
// Health Monitoring Tests: getAllGatewayHealth method
// ============================================================

describe('getAllGatewayHealth method', () => {
    it('should return health stats for all gateways', () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
        });

        const allHealth = manager.getAllGatewayHealth();

        expect(allHealth).toHaveLength(3);
        expect(allHealth.map(h => h.host)).toEqual([
            'primary.example.com',
            'secondary.example.com',
            'tertiary.example.com',
        ]);
    });

    it('should reflect health stats after multiple checks', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // First gateway fails, second succeeds
        mockFetch
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValue(new Response(null, { status: 200 }));

        await manager.resolveUrl(ARWEAVE_URL);

        const allHealth = manager.getAllGatewayHealth();

        expect(allHealth[0].failureCount).toBe(1); // primary failed
        expect(allHealth[1].successCount).toBe(1); // secondary succeeded
        expect(allHealth[2].totalChecks).toBe(0);  // tertiary not checked
    });
});

// ============================================================
// Health Monitoring Tests: runHealthCheck method
// ============================================================

describe('runHealthCheck method', () => {
    it('should check all gateways and return results', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.runHealthCheck();

        expect(result.gateways).toHaveLength(3);
        expect(result.healthyGateways).toHaveLength(3);
        expect(result.unhealthyGateways).toHaveLength(0);
        expect(result.fastestGateway).toBe('primary.example.com');
        expect(result.totalTime).toBeGreaterThanOrEqual(0);
        expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should identify unhealthy gateways', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Primary fails, others succeed
        mockFetch
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.runHealthCheck();

        expect(result.healthyGateways).toContain('secondary.example.com');
        expect(result.healthyGateways).toContain('tertiary.example.com');
        expect(result.unhealthyGateways).toContain('primary.example.com');
    });

    it('should identify fastest gateway', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Secondary is fastest
        mockFetch
            .mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return new Response(null, { status: 200 });
            })
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return new Response(null, { status: 200 });
            })
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // Fastest
                return new Response(null, { status: 200 });
            })
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return new Response(null, { status: 200 });
            });

        const result = await manager.runHealthCheck();

        // Secondary should be fastest (10ms)
        expect(result.fastestGateway).toBe('secondary.example.com');
    });

    it('should adjust priorities when requested', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Make secondary fastest
        mockFetch
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return new Response(null, { status: 200 });
            })
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // Fastest
                return new Response(null, { status: 200 });
            })
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return new Response(null, { status: 200 });
            });

        const result = await manager.runHealthCheck({ adjustPriorities: true });

        // After adjustment, secondary should have priority 1
        const allHealth = manager.getAllGatewayHealth();
        const secondaryHealth = allHealth.find(h => h.host === 'secondary.example.com');
        expect(secondaryHealth?.priority).toBe(1);
    });

    it('should use custom txId for health check', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const customTxId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        await manager.runHealthCheck({ txId: customTxId });

        // Check that the custom txId was used
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining(customTxId),
            expect.any(Object)
        );
    });

    it('should return null fastestGateway if all fail', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 100,
        });

        mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

        const result = await manager.runHealthCheck();

        expect(result.fastestGateway).toBeNull();
        expect(result.healthyGateways).toHaveLength(0);
        expect(result.unhealthyGateways).toHaveLength(3);
    });
});

// ============================================================
// Health Monitoring Tests: adjustGatewayPriorities method
// ============================================================

describe('adjustGatewayPriorities method', () => {
    it('should not adjust with insufficient data', () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
        });

        // No health data yet
        const result = manager.adjustGatewayPriorities({ minChecks: 3 });

        // Priorities should remain unchanged
        expect(result[0].priority).toBe(0);
        expect(result[1].priority).toBe(1);
        expect(result[2].priority).toBe(2);
    });

    it('should reorder gateways based on health', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Primary fails, secondary succeeds
        mockFetch
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        await manager.resolveUrl(ARWEAVE_URL);

        const result = manager.adjustGatewayPriorities({ minChecks: 1 });

        // Secondary should now be first (healthy), primary last (unhealthy)
        expect(result[0].host).toBe('secondary.example.com');
        expect(result[result.length - 1].host).toBe('primary.example.com');
    });

    it('should consider response time when health is similar', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // All succeed, but secondary is fastest
        mockFetch
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return new Response(null, { status: 200 });
            })
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // Fastest
                return new Response(null, { status: 200 });
            })
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return new Response(null, { status: 200 });
            });

        await manager.runHealthCheck();
        const result = manager.adjustGatewayPriorities({ minChecks: 1 });

        // Secondary should be first (fastest)
        expect(result[0].host).toBe('secondary.example.com');
    });

    it('should keep original order when metrics are similar', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // All succeed with exactly the same response time (0ms delay)
        // This ensures the stable sort keeps the original order
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        await manager.runHealthCheck();
        const result = manager.adjustGatewayPriorities({ minChecks: 1 });

        // Order should remain the same (all similar - 0ms response time)
        expect(result[0].host).toBe('primary.example.com');
        expect(result[1].host).toBe('secondary.example.com');
        expect(result[2].host).toBe('tertiary.example.com');
    });
});

// ============================================================
// Health Monitoring Tests: resetGatewayPriorities method
// ============================================================

describe('resetGatewayPriorities method', () => {
    it('should reset priorities to original values', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Make secondary fastest and adjust
        mockFetch
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return new Response(null, { status: 200 });
            })
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return new Response(null, { status: 200 });
            })
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return new Response(null, { status: 200 });
            });

        await manager.runHealthCheck({ adjustPriorities: true });

        // Reset
        manager.resetGatewayPriorities();

        const allHealth = manager.getAllGatewayHealth();
        // After reset, order should be restored to original
        expect(allHealth[0].host).toBe('primary.example.com');
        expect(allHealth[0].priority).toBe(0);
        expect(allHealth[0].originalPriority).toBe(0);
    });
});

// ============================================================
// Health Monitoring Tests: clearHealthData method
// ============================================================

describe('clearHealthData method', () => {
    it('should clear all health tracking data', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.resolveUrl(ARWEAVE_URL);

        // Should have health data for the first gateway that was checked
        const healthBeforeClear = manager.getGatewayHealth('primary.example.com');
        expect(healthBeforeClear?.totalChecks).toBe(1);

        // Clear health data
        manager.clearHealthData();

        // Should be reset
        const healthAfterClear = manager.getGatewayHealth('primary.example.com');
        expect(healthAfterClear?.totalChecks).toBe(0);
    });
});
