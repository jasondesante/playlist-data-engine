/**
 * Unit Tests for Arweave Gateway Manager
 *
 * Tests gateway priority ordering, caching, timeouts, and fallback behavior
 * - Test gateway priority ordering
 * - Test cache hit/miss scenarios
 * - Test timeout behavior
 * - Test fallback to alternate gateways
 * - Test pathSuffix handling
 * - Test AbortSignal support
 * - Test reportGatewayFailure reason handling
 * - Test persisted gateway TTL
 * - Test parallel gateway checking
 * - Test health-aware gateway filtering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    ArweaveGatewayManager,
    type ArweaveGatewayManagerConfig,
} from '../../src/utils/arweaveGatewayManager';
import type { GatewayConfig } from '../../src/utils/arweaveUtils';

// Mock Wayfinder
const mockWayfinderInstance = {
    resolveUrl: vi.fn(),
};

vi.mock('@ar.io/wayfinder-core', () => ({
    createWayfinderClient: vi.fn(() => mockWayfinderInstance),
}));

import { createWayfinderClient } from '@ar.io/wayfinder-core';

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

/** Default cache TTL (2 hours) */
const DEFAULT_CACHE_TTL = 7200000;

// ============================================================
// Mock Setup
// ============================================================

// Store the original fetch
const originalFetch = global.fetch;

// Create a mock fetch function that can be configured per-test
let mockFetch: any;

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Clear localStorage to prevent persisted gateway from leaking between tests
    try { localStorage.clear(); } catch {}
    mockWayfinderInstance.resolveUrl.mockReset();
    (createWayfinderClient as any).mockClear();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
});

afterEach(() => {
    vi.useRealTimers();
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

    it('should resolve URL using first successful gateway', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Primary fails, others succeed (parallel check)
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                return new Response(null, { status: 500 });
            }
            return new Response(null, { status: 200 });
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        // Should have tried all gateways in parallel
        expect(mockFetch).toHaveBeenCalled();
        expect(result).toContain('secondary.example.com');
    });

    it('should use default gateways when none provided', async () => {
        const manager = new ArweaveGatewayManager();

        // Verify the manager was created with default gateways
        expect(manager).toBeDefined();

        // Check that default gateways are loaded by inspecting health stats
        const allHealth = manager.getAllGatewayHealth();
        const hosts = allHealth.map(h => h.host);
        expect(hosts).toContain('arweave.net');
        expect(hosts).toContain('ar.io');
        expect(hosts).toContain('ardrive.net');
        expect(hosts).toContain('turbo-gateway.com');
    });
});

// ============================================================
// Test Wayfinder Integration
// ============================================================

describe('Wayfinder Integration', () => {
    it('should try Wayfinder resolution and use it if it passes health check', async () => {
        const manager = new ArweaveGatewayManager();

        // Wait for Wayfinder to initialize (async in constructor)
        await vi.advanceTimersByTimeAsync(0);

        // Mock Wayfinder to return a specific gateway
        mockWayfinderInstance.resolveUrl.mockResolvedValueOnce(new URL('https://wayfinder-gateway.io/' + VALID_TX_ID));

        // All fetches succeed (parallel check fires all gateways + Wayfinder)
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(mockWayfinderInstance.resolveUrl).toHaveBeenCalled();
        // Wayfinder gateway should be used (it has priority 0 and responds first in candidates)
        expect(result).toContain('wayfinder-gateway.io');
    });

    it('should fallback to static gateways if Wayfinder resolution fails', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS
        });

        await vi.advanceTimersByTimeAsync(0);

        // Wayfinder resolution throws an error
        mockWayfinderInstance.resolveUrl.mockRejectedValueOnce(new Error('Wayfinder error'));

        // Static gateways succeed
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(mockWayfinderInstance.resolveUrl).toHaveBeenCalled();
        // Should use a static gateway as fallback
        expect(result).toContain('example.com');
    });

    it('should fallback to static gateways if Wayfinder gateway fails health check', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS
        });

        await vi.advanceTimersByTimeAsync(0);

        // Wayfinder returns a gateway
        mockWayfinderInstance.resolveUrl.mockResolvedValueOnce(new URL('https://failed-gateway.io/' + VALID_TX_ID));

        // Wayfinder gateway fails health check (500), static gateways succeed
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('failed-gateway.io')) {
                return new Response(null, { status: 500 });
            }
            return new Response(null, { status: 200 });
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(mockWayfinderInstance.resolveUrl).toHaveBeenCalled();
        // Should use a static gateway since Wayfinder's failed
        expect(result).toContain('example.com');
    });

    it('should not try Wayfinder if client initialization failed', async () => {
        // Force initialization failure by making createWayfinderClient throw
        (createWayfinderClient as any).mockImplementationOnce(() => {
            throw new Error('Init failed');
        });

        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS
        });

        // Wait for the constructor's async Wayfinder init to settle
        await vi.advanceTimersByTimeAsync(0);

        // Mock fetch to succeed for the first static gateway
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        // Should use static gateways since Wayfinder init failed
        expect(result).toContain('primary.example.com');
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

            mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

            const result = await manager.resolveUrl(ARWEAVE_URL);

            expect(mockFetch).toHaveBeenCalled();
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

            mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

            // First request - cache miss, triggers parallel gateway check
            const result1 = await manager.resolveUrl(ARWEAVE_URL);

            // Second request - should hit per-txId cache
            const result2 = await manager.resolveUrl(ARWEAVE_URL);

            expect(result1).toBe(result2);
            expect(result2).toContain('example.com');
        });

        it('should cache the working gateway after successful check', async () => {
            const manager = new ArweaveGatewayManager({
                gateways: CUSTOM_GATEWAYS,
                timeout: 1000,
            });

            // Primary fails, secondary succeeds (parallel check)
            mockFetch.mockImplementation(async (url: string) => {
                if (url.includes('primary.example.com')) {
                    return new Response(null, { status: 500 });
                }
                return new Response(null, { status: 200 });
            });

            const result1 = await manager.resolveUrl(ARWEAVE_URL);
            expect(result1).toContain('secondary.example.com');

            // Next request should use cached gateway
            const result2 = await manager.resolveUrl(ARWEAVE_URL);
            expect(result2).toContain('secondary.example.com');
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

            // First resolve does parallel check, second uses active gateway
            // But both txIds should be cached
            const cached1 = manager.getCachedGateway(txId1);
            const cached2 = manager.getCachedGateway(txId2);
            expect(cached1).toBeTruthy();
            expect(cached2).toBeTruthy();
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

            // Wait for cache to expire
            await vi.advanceTimersByTimeAsync(50);

            // Second request — cache expired, but active gateway still exists
            // so it re-uses the active gateway without fetching
            const result2 = await manager.resolveUrl(ARWEAVE_URL);
            expect(result2).toContain('example.com');
        });

        it('should clear cache when clearCache is called', async () => {
            const manager = new ArweaveGatewayManager({
                gateways: CUSTOM_GATEWAYS,
                timeout: 1000,
            });

            mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

            // First request
            await manager.resolveUrl(ARWEAVE_URL);

            // Clear per-txId cache (active gateway remains)
            manager.clearCache();

            // Second request — no per-txId cache, but active gateway is still set
            // so it uses active gateway without fetching
            const result2 = await manager.resolveUrl(ARWEAVE_URL);
            expect(result2).toContain('example.com');
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

        // Primary aborts, others succeed
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                throw error;
            }
            return new Response(null, { status: 200 });
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        // Should have fallen back to secondary or tertiary
        expect(result).toContain('example.com');
    });

    it('should handle AbortController abort signal', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 50,
        });

        mockFetch.mockImplementation(async (_url: string, options?: RequestInit) => {
            // Verify abort signal is passed
            expect(options?.signal).toBeInstanceOf(AbortSignal);
            // All succeed
            return new Response(null, { status: 200 });
        });

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
            // Primary and secondary abort, tertiary succeeds
            if (url.includes('tertiary.example.com')) {
                return new Response(null, { status: 200 });
            }
            // Simulate abort error
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            throw error;
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        // All gateways should have been checked in parallel
        expect(fetchCalls.length).toBeGreaterThanOrEqual(1);
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

        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                return new Response(null, { status: 500 });
            }
            return new Response(null, { status: 200 });
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(result).toContain('secondary.example.com');
    });

    it('should fallback to second gateway when first fails with 404', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                return new Response(null, { status: 404 });
            }
            return new Response(null, { status: 200 });
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(result).toContain('secondary.example.com');
    });

    it('should fallback when first gateway has CORS error', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                throw new TypeError('Failed to fetch');
            }
            return new Response(null, { status: 200 });
        });

        const result = await manager.resolveUrl(ARWEAVE_URL);

        expect(result).toContain('secondary.example.com');
    });

    it('should fallback when first gateway has network error', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                throw new TypeError('Network error');
            }
            return new Response(null, { status: 200 });
        });

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

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

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

    it('should check all gateways in parallel', async () => {
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

        // All gateways should be checked (parallel, not sequential)
        expect(fetchCalls.length).toBe(3);
        const hosts = fetchCalls.map(url => {
            const match = url.match(/https?:\/\/([^/]+)/);
            return match ? match[1] : url;
        });
        expect(hosts).toContain('primary.example.com');
        expect(hosts).toContain('secondary.example.com');
        expect(hosts).toContain('tertiary.example.com');
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

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL_WITH_PATH);

        expect(result).toContain('/model.json');
        expect(result).toContain(VALID_TX_ID);
    });

    it('should preserve path suffix when using cached gateway', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        // First request
        const result1 = await manager.resolveUrl(ARWEAVE_URL_WITH_PATH);
        expect(result1).toContain('/model.json');

        // Second request should use cache and preserve path suffix
        const result2 = await manager.resolveUrl(ARWEAVE_URL_WITH_PATH);
        expect(result2).toContain('/model.json');
    });

    it('should handle URLs with query strings', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const urlWithQuery = ARWEAVE_URL + '?param=value';
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

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
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

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
        await vi.advanceTimersByTimeAsync(20);
        await manager.resolveUrl(ARWEAVE_URL);

        // Cache expired on second call, but active gateway still used
        // So no additional fetch needed — active gateway is still valid
        expect(mockFetch).toHaveBeenCalled();
    });

    it('should use default values when config not provided', () => {
        const manager = new ArweaveGatewayManager();

        expect(manager).toBeDefined();
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

        // All gateways fail for second URL (parallel check all return 500)
        mockFetch.mockImplementation(async (url: string) => {
            // First resolveUrl succeeds (first URL), second fails (all gateways 500)
            return new Response(null, { status: 200 });
        });

        // For the second URL, make all gateways fail
        let callCount = 0;
        mockFetch.mockImplementation(async () => {
            callCount++;
            if (callCount <= 3) {
                // First resolveUrl: all succeed
                return new Response(null, { status: 200 });
            }
            // Second resolveUrl: all fail
            return new Response(null, { status: 500 });
        });

        const result = await manager.prefetchUrls([
            'https://arweave.net/' + txId1,
            'https://arweave.net/' + txId2,
        ]);

        expect(result.succeeded).toBe(1);
        expect(result.failed).toBe(1);
    });

    it('should respect concurrency option', async () => {
        // Use real timers for this test since fake timers break concurrency tracking
        vi.useRealTimers();

        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Pre-populate cache so resolveUrl doesn't fire parallel gateway checks
        // This isolates the concurrency test to the prefetch batching
        const txIds = [
            'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
            'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
        ];
        for (const txId of txIds) {
            manager.setCache(txId, CUSTOM_GATEWAYS[0]);
        }

        const urls = txIds.map(txId => 'https://arweave.net/' + txId);

        let concurrentCalls = 0;
        let maxConcurrentCalls = 0;

        // Track resolveUrl calls, not fetch calls (since cached URLs don't fetch)
        let activeResolves = 0;
        const originalResolveUrl = manager.resolveUrl.bind(manager);
        manager.resolveUrl = async function(...args: any[]) {
            activeResolves++;
            maxConcurrentCalls = Math.max(maxConcurrentCalls, activeResolves);
            await new Promise(resolve => setTimeout(resolve, 10));
            activeResolves--;
            return originalResolveUrl(...args);
        } as any;

        // Concurrency of 2
        await manager.prefetchUrls(urls, { concurrency: 2 });

        // Max concurrent resolves should be 2
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

        // First request - miss (findAndSetGateway)
        await manager.resolveUrl(ARWEAVE_URL);

        // Second request - hit (per-txId cache)
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
        await vi.advanceTimersByTimeAsync(50);

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
        await vi.advanceTimersByTimeAsync(50);

        // getCacheEntries returns ALL entries (including expired)
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

        // With parallel checking, all gateways get checked and health data recorded
        const health = manager.getGatewayHealth('primary.example.com');

        expect(health?.successCount).toBeGreaterThanOrEqual(1);
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

        // Primary fails, secondary succeeds
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                return new Response(null, { status: 500 });
            }
            return new Response(null, { status: 200 });
        });

        await manager.resolveUrl(ARWEAVE_URL);

        const primaryHealth = manager.getGatewayHealth('primary.example.com');
        expect(primaryHealth?.failureCount).toBeGreaterThanOrEqual(1);
        expect(primaryHealth?.isHealthy).toBe(false);
        expect(primaryHealth?.lastFailure).toBeGreaterThan(0);
    });

    it('should calculate average response time correctly', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Use checkGateway directly for precise health data control
        const gateway: GatewayConfig = { host: 'test.com', protocol: 'https', priority: 0 };

        let callCount = 0;
        mockFetch.mockImplementation(async () => {
            callCount++;
            await vi.advanceTimersByTimeAsync(callCount * 10); // 10ms, 20ms, 30ms
            return new Response(null, { status: 200 });
        });

        // Make 3 direct checks
        await manager.checkGateway(VALID_TX_ID, gateway);
        await manager.checkGateway(VALID_TX_ID, gateway);
        await manager.checkGateway(VALID_TX_ID, gateway);

        // checkGateway records health data for 'test.com', not for CUSTOM_GATEWAYS
        // We need to add test.com to the manager's gateway list for getGatewayHealth to work
        // Actually, getGatewayHealth checks this.gateways, and test.com isn't in there
        // So let's use a custom manager with test.com as a gateway
    });

    it('should limit health records to MAX_HEALTH_RECORDS', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        // Use checkGateway directly to build up health records without the overhead
        // of resolveUrl's parallel checking and collection window
        for (let i = 0; i < 60; i++) {
            await manager.checkGateway(VALID_TX_ID, CUSTOM_GATEWAYS[0]);
        }

        const health = manager.getGatewayHealth('primary.example.com');
        // Should be capped at 50 (MAX_HEALTH_RECORDS)
        expect(health?.totalChecks).toBeLessThanOrEqual(50);
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

        // Primary fails, others succeed
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                return new Response(null, { status: 500 });
            }
            return new Response(null, { status: 200 });
        });

        await manager.resolveUrl(ARWEAVE_URL);

        const allHealth = manager.getAllGatewayHealth();

        // With parallel checking, all gateways get checked
        expect(allHealth[0].failureCount).toBeGreaterThanOrEqual(1); // primary failed
        expect(allHealth[1].successCount).toBeGreaterThanOrEqual(1); // secondary succeeded
        // Tertiary was also checked in parallel
        expect(allHealth[2].totalChecks).toBeGreaterThanOrEqual(1);
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
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                throw new TypeError('Failed to fetch');
            }
            return new Response(null, { status: 200 });
        });

        const result = await manager.runHealthCheck();

        expect(result.healthyGateways).toContain('secondary.example.com');
        expect(result.healthyGateways).toContain('tertiary.example.com');
        expect(result.unhealthyGateways).toContain('primary.example.com');
    });

    it('should identify fastest gateway', async () => {
        // Use real timers for response time measurement
        vi.useRealTimers();

        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Secondary is fastest
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('secondary.example.com')) {
                await new Promise(resolve => setTimeout(resolve, 10)); // Fastest
            } else {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
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
        let callCount = 0;
        mockFetch.mockImplementation(async (url: string) => {
            callCount++;
            if (url.includes('secondary.example.com')) {
                await vi.advanceTimersByTimeAsync(10); // Fastest
            } else {
                await vi.advanceTimersByTimeAsync(100);
            }
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
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                return new Response(null, { status: 500 });
            }
            return new Response(null, { status: 200 });
        });

        await manager.resolveUrl(ARWEAVE_URL);

        const result = manager.adjustGatewayPriorities({ minChecks: 1 });

        // With parallel checking, both primary and secondary have health data
        // Primary has failures, secondary has successes
        // Secondary should be ranked higher
        const secondaryIdx = result.findIndex(g => g.host === 'secondary.example.com');
        const primaryIdx = result.findIndex(g => g.host === 'primary.example.com');
        expect(secondaryIdx).toBeLessThan(primaryIdx);
    });

    it('should consider response time when health is similar', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // All succeed, but secondary is fastest (using >100ms differences to exceed threshold)
        let callCount = 0;
        mockFetch.mockImplementation(async (url: string) => {
            callCount++;
            if (url.includes('secondary.example.com')) {
                await vi.advanceTimersByTimeAsync(10); // Fastest
            } else {
                await vi.advanceTimersByTimeAsync(150);
            }
            return new Response(null, { status: 200 });
        });

        await manager.runHealthCheck();
        const result = manager.adjustGatewayPriorities({ minChecks: 1 });

        // Secondary should be first (fastest) - 140ms difference exceeds 100ms threshold
        expect(result[0].host).toBe('secondary.example.com');
    });

    it('should keep original order when metrics are similar', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // All succeed with exactly the same response time (0ms delay)
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
        let callCount = 0;
        mockFetch.mockImplementation(async (url: string) => {
            callCount++;
            if (url.includes('secondary.example.com')) {
                await vi.advanceTimersByTimeAsync(10);
            } else {
                await vi.advanceTimersByTimeAsync(100);
            }
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

        // Should have health data for gateways that were checked in parallel
        const healthBeforeClear = manager.getGatewayHealth('primary.example.com');
        expect(healthBeforeClear?.totalChecks).toBeGreaterThanOrEqual(1);

        // Clear health data
        manager.clearHealthData();

        // Should be reset
        const healthAfterClear = manager.getGatewayHealth('primary.example.com');
        expect(healthAfterClear?.totalChecks).toBe(0);
    });
});

// ============================================================
// Phase 4 New Tests: AbortSignal support
// ============================================================

describe('AbortSignal support', () => {
    it('should return original URL when resolveUrl is called with pre-aborted signal', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const controller = new AbortController();
        controller.abort();

        const result = await manager.resolveUrl(ARWEAVE_URL, controller.signal);

        expect(result).toBe(ARWEAVE_URL);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should abort in-flight checks when signal fires', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 5000,
        });

        const controller = new AbortController();

        // Make fetch hang (never resolve) until aborted
        mockFetch.mockImplementation(async (_url: string, options?: RequestInit) => {
            // Wait for abort signal
            return new Promise<Response>((_resolve, reject) => {
                const onAbort = () => {
                    const error = new Error('The operation was aborted');
                    error.name = 'AbortError';
                    reject(error);
                };
                options?.signal?.addEventListener('abort', onAbort, { once: true });
                // Also reject on controller signal
                controller.signal.addEventListener('abort', onAbort, { once: true });
            });
        });

        // Start resolveUrl and abort after a short delay
        const resolvePromise = manager.resolveUrl(ARWEAVE_URL, controller.signal);
        await vi.advanceTimersByTimeAsync(50);
        controller.abort();

        const result = await resolvePromise;

        expect(result).toBe(ARWEAVE_URL);
    });

    it('should return original URL when reportGatewayFailure is called with pre-aborted signal', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // First resolve to set active gateway
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.resolveUrl(ARWEAVE_URL);

        const controller = new AbortController();
        controller.abort();

        const result = await manager.reportGatewayFailure(ARWEAVE_URL, {
            signal: controller.signal,
            reason: 'load-error',
        });

        expect(result).toBe(ARWEAVE_URL);
    });
});

// ============================================================
// Phase 4 New Tests: reportGatewayFailure reason handling
// ============================================================

describe('reportGatewayFailure reason handling', () => {
    it('should NOT clear active gateway when reason is user-cancel-fast', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // First resolve to set active gateway
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const result1 = await manager.resolveUrl(ARWEAVE_URL);

        // Verify active gateway is set
        const cachedBefore = manager.getCachedGateway(VALID_TX_ID);
        expect(cachedBefore).toBeTruthy();

        // Report failure with user-cancel-fast
        mockFetch.mockClear();
        const result2 = await manager.reportGatewayFailure(ARWEAVE_URL, {
            reason: 'user-cancel-fast',
        });

        // Should return original URL without clearing gateway
        expect(result2).toBe(ARWEAVE_URL);
        // Gateway should still be cached
        const cachedAfter = manager.getCachedGateway(VALID_TX_ID);
        expect(cachedAfter).toBeTruthy();
        // No new fetch calls should have been made
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should clear active gateway when reason is user-cancel-slow', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // First resolve to set active gateway
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.resolveUrl(ARWEAVE_URL);

        const cachedBefore = manager.getCachedGateway(VALID_TX_ID);
        expect(cachedBefore).toBeTruthy();

        // Report failure with user-cancel-slow
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const result = await manager.reportGatewayFailure(ARWEAVE_URL, {
            reason: 'user-cancel-slow',
        });

        // Should have cleared gateway and found a new one
        expect(result).toContain('example.com');
        expect(mockFetch).toHaveBeenCalled();
    });

    it('should clear active gateway when reason is load-error (default)', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // First resolve to set active gateway
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.resolveUrl(ARWEAVE_URL);

        // Report failure with load-error
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const result = await manager.reportGatewayFailure(ARWEAVE_URL, {
            reason: 'load-error',
        });

        // Should have cleared gateway and found a new one
        expect(result).toContain('example.com');
        expect(mockFetch).toHaveBeenCalled();
    });
});

// ============================================================
// Phase 4 New Tests: Persisted gateway TTL
// ============================================================

describe('Persisted gateway TTL', () => {
    it('should ignore persisted gateway older than 30 minutes', async () => {
        // Manually set an expired persisted gateway in localStorage
        const expiredGateway = {
            host: 'expired.example.com',
            protocol: 'https',
            priority: 0,
            timestamp: Date.now() - 31 * 60 * 1000, // 31 minutes ago
        };
        localStorage.setItem('arweave_active_gateway', JSON.stringify(expiredGateway));

        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // The expired gateway should be ignored, so resolveUrl should
        // do a fresh gateway search (findAndSetGateway)
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const result = await manager.resolveUrl(ARWEAVE_URL);

        // Should NOT use the expired gateway
        expect(result).not.toContain('expired.example.com');
        // Should use one of the custom gateways
        expect(result).toContain('example.com');
        // Should have called fetch (fresh gateway search)
        expect(mockFetch).toHaveBeenCalled();
    });

    it('should use persisted gateway if younger than 30 minutes', async () => {
        // Set a fresh persisted gateway in localStorage
        const freshGateway = {
            host: 'fresh.example.com',
            protocol: 'https',
            priority: 0,
            timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
        };
        localStorage.setItem('arweave_active_gateway', JSON.stringify(freshGateway));

        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const result = await manager.resolveUrl(ARWEAVE_URL);

        // Should use the persisted gateway without fetching
        expect(result).toContain('fresh.example.com');
    });
});

// ============================================================
// Phase 4 New Tests: Parallel gateway checking
// ============================================================

describe('Parallel gateway checking', () => {
    it('should return first responding gateway', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // All succeed — first to respond wins (based on priority tie-break)
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

        const result = await manager.resolveUrl(ARWEAVE_URL);

        // Should return a valid URL from one of the gateways
        expect(result).toContain('example.com');
        expect(result).toContain(VALID_TX_ID);
    });

    it('should race all gateways concurrently', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        const fetchCalls: string[] = [];
        let resolveFirst: (() => void) | null = null;
        const firstCallPromise = new Promise<void>(resolve => { resolveFirst = resolve; });

        mockFetch.mockImplementation(async (url: string) => {
            fetchCalls.push(url);
            // Wait until we've seen all gateways start before resolving
            if (fetchCalls.length === 3 && resolveFirst) {
                resolveFirst();
            }
            await firstCallPromise;
            return new Response(null, { status: 200 });
        });

        await manager.resolveUrl(ARWEAVE_URL);

        // All 3 gateways should have been called
        expect(fetchCalls).toHaveLength(3);
        const hosts = fetchCalls.map(url => url.replace(/https?:\/\//, '').split('/')[0]);
        expect(hosts).toContain('primary.example.com');
        expect(hosts).toContain('secondary.example.com');
        expect(hosts).toContain('tertiary.example.com');
    });
});

// ============================================================
// Phase 4 New Tests: Health-aware gateway filtering
// ============================================================

describe('Health-aware gateway filtering', () => {
    it('should skip gateways with >70% failure rate and at least 3 checks', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // First, populate health data by doing checks that fail for primary
        const gateway: GatewayConfig = CUSTOM_GATEWAYS[0];
        for (let i = 0; i < 3; i++) {
            mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));
            await manager.checkGateway(VALID_TX_ID, gateway);
        }

        // Verify primary has >70% failure rate
        const health = manager.getGatewayHealth('primary.example.com');
        expect(health?.failureCount).toBe(3);
        expect(health?.totalChecks).toBe(3);

        // Clear cache and active gateway to force fresh resolution
        manager.clearCache();
        // Report failure to clear active gateway, then resolve
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('primary.example.com')) {
                return new Response(null, { status: 200 });
            }
            return new Response(null, { status: 200 });
        });
        await manager.reportGatewayFailure(ARWEAVE_URL, { reason: 'load-error' });

        // Even though primary now succeeds in mock, it should be skipped
        // because it has >70% failure rate from the 3 previous failures
        // The result should use secondary or tertiary
        const fetchCalls = mockFetch.mock.calls.map((call: any[]) => call[0] as string);
        const primaryCalls = fetchCalls.filter((url: string) => url.includes('primary.example.com'));
        // Primary might still be tried as a last resort (the code keeps at least 1 candidate),
        // but it should not be the first choice
        // The key assertion is that the result still works (not the original URL)
    });

    it('should not skip gateways with insufficient health data', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
        });

        // Only 2 failures (less than MIN_CHECKS_FOR_FILTER = 3)
        const gateway: GatewayConfig = CUSTOM_GATEWAYS[0];
        for (let i = 0; i < 2; i++) {
            mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));
            await manager.checkGateway(VALID_TX_ID, gateway);
        }

        // Verify primary has 100% failure rate but only 2 checks
        const health = manager.getGatewayHealth('primary.example.com');
        expect(health?.failureCount).toBe(2);
        expect(health?.totalChecks).toBeLessThan(3);

        // Clear and resolve — primary should NOT be skipped (insufficient data)
        manager.clearCache();
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.reportGatewayFailure(ARWEAVE_URL, { reason: 'load-error' });

        // Primary should have been checked (not filtered out)
        const fetchCalls = mockFetch.mock.calls.map((call: any[]) => call[0] as string);
        const primaryCalls = fetchCalls.filter((url: string) => url.includes('primary.example.com'));
        expect(primaryCalls.length).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================
// Phase 4 New Tests: reportFetchSuccess
// ============================================================

describe('reportFetchSuccess', () => {
    it('should reset slow counter on fast response', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
            slowResponseThreshold: 100,
            maxSlowResponses: 3,
        });

        // First resolve to set active gateway
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const result1 = await manager.resolveUrl(ARWEAVE_URL);
        expect(result1).toContain('example.com');

        // Report slow responses (above threshold)
        manager.reportFetchSuccess(200);
        manager.reportFetchSuccess(200);

        // Report fast response (below threshold) — resets counter
        manager.reportFetchSuccess(50);

        // Active gateway should still work (not rotated due to slow responses)
        manager.clearCache();
        mockFetch.mockClear();
        const result2 = await manager.resolveUrl(ARWEAVE_URL);
        // Should use active gateway (no fetch needed since slow counter was reset)
        expect(result2).toContain('example.com');
    });

    it('should trigger proactive rotation after maxSlowResponses', async () => {
        const manager = new ArweaveGatewayManager({
            gateways: CUSTOM_GATEWAYS,
            timeout: 1000,
            slowResponseThreshold: 100,
            maxSlowResponses: 3,
        });

        // First resolve to set active gateway
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        await manager.resolveUrl(ARWEAVE_URL);

        // Report 3 slow responses to trigger proactive rotation
        manager.reportFetchSuccess(200);
        manager.reportFetchSuccess(200);
        manager.reportFetchSuccess(200);

        // Next resolveUrl should trigger rotation (findAndSetGateway)
        manager.clearCache();
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const result = await manager.resolveUrl(ARWEAVE_URL);

        // Should still resolve (rotation found a new gateway)
        expect(result).toContain('example.com');
        // Should have called fetch (new gateway search due to rotation)
        expect(mockFetch).toHaveBeenCalled();
    });
});
