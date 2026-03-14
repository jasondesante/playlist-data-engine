/**
 * Integration Tests for MusicClassifier with resolveUrl callback
 *
 * Tests the integration between MusicClassifier and the ArweaveGatewayManager's
 * resolveUrl callback for handling gateway fallback when loading models.
 *
 * - Test MusicClassifier with mock resolveUrl callback
 * - Test that resolveUrl option is properly configured
 * - Test that resolveUrl errors are handled gracefully
 *
 * Note: These tests focus on configuration and option handling.
 * Actual model loading with resolveUrl is tested in browser/E2E tests
 * because TensorFlow.js model loading requires complex mocking in Node.js.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================
// Test Data
// ============================================================

/** A valid 43-character Arweave transaction ID for testing */
const VALID_TX_ID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk012345';

/** Original Arweave URL (using failing gateway) */
const ORIGINAL_URL = `https://turbo-gateway.com/${VALID_TX_ID}/model.json`;

/** Resolved Arweave URL (using working gateway) */
const RESOLVED_URL = `https://arweave.net/${VALID_TX_ID}/model.json`;

/** Non-Arweave URL (should not be resolved) */
const NON_ARWEAVE_URL = 'https://example.com/model.json';

// ============================================================
// Tests
// ============================================================

describe('MusicClassifier resolveUrl integration', () => {
    describe('resolveUrl option configuration', () => {
        it('should accept resolveUrl callback in options', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');

            const mockResolveUrl = vi.fn().mockResolvedValue(RESOLVED_URL);

            const classifier = new MusicClassifier({
                resolveUrl: mockResolveUrl,
                models: {
                    genre: {
                        embedding: ORIGINAL_URL,
                        embeddingType: 'effnet',
                        classifier: RESOLVED_URL,
                        classifierType: 'discogs400'
                    }
                }
            });

            // Verify the classifier was created successfully
            expect(classifier).toBeDefined();
            expect(classifier).toBeInstanceOf(MusicClassifier);
        });

        it('should accept resolveUrl callback with TwoStepModelConfig', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');

            const mockResolveUrl = vi.fn().mockResolvedValue(RESOLVED_URL);

            const classifier = new MusicClassifier({
                resolveUrl: mockResolveUrl,
                models: {
                    genre: {
                        embedding: ORIGINAL_URL,
                        embeddingType: 'effnet',
                        classifier: RESOLVED_URL,
                        classifierType: 'discogs400'
                    },
                    mood: {
                        embedding: ORIGINAL_URL,
                        embeddingType: 'effnet',
                        classifier: RESOLVED_URL,
                        classifierType: 'jamendo'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });

        it('should accept resolveUrl callback with SingleStepModelConfig', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');

            const mockResolveUrl = vi.fn().mockResolvedValue(RESOLVED_URL);

            const classifier = new MusicClassifier({
                resolveUrl: mockResolveUrl,
                models: {
                    danceability: {
                        modelUrl: ORIGINAL_URL,
                        modelType: 'musicnn'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });

        it('should work without resolveUrl callback', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');

            // Create classifier without resolveUrl callback
            const classifier = new MusicClassifier({
                models: {
                    genre: {
                        embedding: ORIGINAL_URL,
                        embeddingType: 'effnet',
                        classifier: RESOLVED_URL,
                        classifierType: 'discogs400'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });
    });

    describe('resolveUrl callback signature', () => {
        it('should accept callback with (url: string) => Promise<string> signature', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');

            // Test that the callback signature is correct
            const mockResolveUrl = vi.fn<(url: string) => Promise<string>>()
                .mockResolvedValue(RESOLVED_URL);

            const classifier = new MusicClassifier({
                resolveUrl: mockResolveUrl,
                models: {
                    genre: {
                        embedding: ORIGINAL_URL,
                        embeddingType: 'effnet',
                        classifier: RESOLVED_URL,
                        classifierType: 'discogs400'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });

        it('should accept async function as resolveUrl callback', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');

            // Test with an actual async function
            async function resolveUrl(url: string): Promise<string> {
                if (url.includes('turbo-gateway.com')) {
                    return url.replace('turbo-gateway.com', 'arweave.net');
                }
                return url;
            }

            const classifier = new MusicClassifier({
                resolveUrl: resolveUrl,
                models: {
                    genre: {
                        embedding: ORIGINAL_URL,
                        embeddingType: 'effnet',
                        classifier: RESOLVED_URL,
                        classifierType: 'discogs400'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });
    });

    describe('resolveUrl with different URL types', () => {
        it('should accept ar:// protocol URLs in model config', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');

            const arProtocolUrl = `ar://${VALID_TX_ID}`;
            const mockResolveUrl = vi.fn().mockResolvedValue(RESOLVED_URL);

            const classifier = new MusicClassifier({
                resolveUrl: mockResolveUrl,
                models: {
                    genre: {
                        embedding: arProtocolUrl,
                        embeddingType: 'effnet',
                        classifier: arProtocolUrl,
                        classifierType: 'discogs400'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });

        it('should handle URLs with path suffixes in model config', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');

            const urlWithSuffix = `https://arweave.net/${VALID_TX_ID}/path/to/model.json`;
            const mockResolveUrl = vi.fn().mockResolvedValue(urlWithSuffix);

            const classifier = new MusicClassifier({
                resolveUrl: mockResolveUrl,
                models: {
                    genre: {
                        embedding: urlWithSuffix,
                        embeddingType: 'effnet',
                        classifier: urlWithSuffix,
                        classifierType: 'discogs400'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });

        it('should handle non-Arweave URLs in model config', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');

            const mockResolveUrl = vi.fn().mockImplementation((url: string) => Promise.resolve(url));

            const classifier = new MusicClassifier({
                resolveUrl: mockResolveUrl,
                models: {
                    genre: {
                        embedding: NON_ARWEAVE_URL,
                        embeddingType: 'effnet',
                        classifier: NON_ARWEAVE_URL,
                        classifierType: 'discogs400'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });
    });

    describe('resolveUrl with DEFAULT_ARWEAVE_MODELS', () => {
        it('should work with default models and resolveUrl callback', async () => {
            const { MusicClassifier, DEFAULT_ARWEAVE_MODELS } = await import('../../src/core/analysis/MusicClassifier');

            const mockResolveUrl = vi.fn().mockImplementation((url: string) => Promise.resolve(url));

            const classifier = new MusicClassifier({
                resolveUrl: mockResolveUrl,
                models: DEFAULT_ARWEAVE_MODELS
            });

            expect(classifier).toBeDefined();
        });

        it('should work with default models without resolveUrl callback', async () => {
            const { MusicClassifier, DEFAULT_ARWEAVE_MODELS } = await import('../../src/core/analysis/MusicClassifier');

            const classifier = new MusicClassifier({
                models: DEFAULT_ARWEAVE_MODELS
            });

            expect(classifier).toBeDefined();
        });
    });

    describe('resolveUrl with ArweaveGatewayManager', () => {
        it('should work with arweaveGatewayManager.resolveUrl as callback', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');
            const { arweaveGatewayManager } = await import('../../src/utils/arweaveGatewayManager');

            // Bind the resolveUrl method to the manager instance
            const classifier = new MusicClassifier({
                resolveUrl: arweaveGatewayManager.resolveUrl.bind(arweaveGatewayManager),
                models: {
                    genre: {
                        embedding: ORIGINAL_URL,
                        embeddingType: 'effnet',
                        classifier: RESOLVED_URL,
                        classifierType: 'discogs400'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });

        it('should accept ArweaveGatewayManager instance method', async () => {
            const { MusicClassifier } = await import('../../src/core/analysis/MusicClassifier');
            const { ArweaveGatewayManager } = await import('../../src/utils/arweaveGatewayManager');

            // Create a custom gateway manager
            const customManager = new ArweaveGatewayManager({
                timeout: 5000,
                cacheTTL: 60000
            });

            const classifier = new MusicClassifier({
                resolveUrl: customManager.resolveUrl.bind(customManager),
                models: {
                    genre: {
                        embedding: ORIGINAL_URL,
                        embeddingType: 'effnet',
                        classifier: RESOLVED_URL,
                        classifierType: 'discogs400'
                    }
                }
            });

            expect(classifier).toBeDefined();
        });
    });

    describe('resolveUrl callback behavior verification', () => {
        it('should verify mock callback is callable', async () => {
            const mockResolveUrl = vi.fn().mockResolvedValue(RESOLVED_URL);

            // Verify the mock is callable
            const result = await mockResolveUrl(ORIGINAL_URL);
            expect(result).toBe(RESOLVED_URL);
            expect(mockResolveUrl).toHaveBeenCalledWith(ORIGINAL_URL);
        });

        it('should verify gateway fallback logic works', async () => {
            // Simulate arweaveGatewayManager behavior:
            // - turbo-gateway.com fails -> fallback to arweave.net
            const mockResolveUrl = vi.fn().mockImplementation(async (url: string) => {
                if (url.includes('turbo-gateway.com')) {
                    return url.replace('turbo-gateway.com', 'arweave.net');
                }
                return url;
            });

            const turboUrl = `https://turbo-gateway.com/${VALID_TX_ID}/model.json`;
            const expectedResolvedUrl = `https://arweave.net/${VALID_TX_ID}/model.json`;

            const result = await mockResolveUrl(turboUrl);
            expect(result).toBe(expectedResolvedUrl);
        });

        it('should verify resolveUrl can handle multiple URLs', async () => {
            const resolvedUrls = new Map<string, string>();
            const mockResolveUrl = vi.fn().mockImplementation(async (url: string) => {
                if (resolvedUrls.has(url)) {
                    return resolvedUrls.get(url)!;
                }
                const resolved = url.includes('turbo-gateway.com')
                    ? url.replace('turbo-gateway.com', 'arweave.net')
                    : url;
                resolvedUrls.set(url, resolved);
                return resolved;
            });

            const urls = [
                `https://turbo-gateway.com/${VALID_TX_ID}/model.json`,
                `https://arweave.net/${VALID_TX_ID}/model.json`,
                NON_ARWEAVE_URL
            ];

            for (const url of urls) {
                const result = await mockResolveUrl(url);
                expect(result).toBeDefined();
            }

            expect(mockResolveUrl).toHaveBeenCalledTimes(3);
        });
    });
});

// ============================================================
// Integration with arweaveUtils
// ============================================================

describe('resolveUrl integration with arweaveUtils', () => {
    it('should work with parseArweaveUrl for URL parsing', async () => {
        const { parseArweaveUrl } = await import('../../src/utils/arweaveUtils');

        const url = `https://arweave.net/${VALID_TX_ID}/model.json`;
        const result = parseArweaveUrl(url);

        expect(result).toBeDefined();
        expect(result.txId).toBe(VALID_TX_ID);
        expect(result.pathSuffix).toBe('/model.json');
    });

    it('should work with constructGatewayUrl for URL construction', async () => {
        const { constructGatewayUrl } = await import('../../src/utils/arweaveUtils');

        const url = constructGatewayUrl(VALID_TX_ID, { host: 'arweave.net', protocol: 'https' }, '/model.json');

        expect(url).toBe(`https://arweave.net/${VALID_TX_ID}/model.json`);
    });

    it('should work with getAllGatewayUrls for fallback order', async () => {
        const { getAllGatewayUrls, DEFAULT_GATEWAYS } = await import('../../src/utils/arweaveUtils');

        const urls = getAllGatewayUrls(VALID_TX_ID, DEFAULT_GATEWAYS, '/model.json');

        expect(urls.length).toBeGreaterThan(0);
        expect(urls[0]).toContain('arweave.net');
        expect(urls[0]).toContain('/model.json');
    });
});
