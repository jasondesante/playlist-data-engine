/**
 * ModelCache — Persistent localForage cache for TensorFlow.js model artifacts.
 *
 * After the first successful download, model artifacts (model.json manifest +
 * weight shard ArrayBuffers) are stored in IndexedDB via localForage. Subsequent
 * loads read from cache without any network requests or gateway resolution.
 *
 * Supports two loading strategies:
 * - `getOrFetchGraphModel()` — loads via custom TF.js IOHandler (for tf.loadGraphModel)
 * - `getOrFetchBlobUrl()` — returns a blob URL (for Essentia TensorflowMusiCNN/VGGish)
 */

import localforage from 'localforage';
import type * as tf from '@tensorflow/tfjs';

// ============================================================================
// Types
// ============================================================================

export interface ModelCacheEntry {
    manifest: string;
    weights: Record<string, ArrayBuffer>;
    savedAt: number;
    originalUrl: string;
}

export interface ModelCacheOptions {
    /** Optional custom localForage instance name. @default 'playlist-data-engine-models' */
    storeName?: string;
    /** Optional description for the IndexedDB database. */
    description?: string;
}

export interface ModelCacheFetchOptions {
    /** Optional callback to resolve URLs (e.g., arweaveGatewayManager). */
    resolveUrl?: (url: string) => Promise<string>;
    /** Optional callback to invalidate cached gateway for a URL after a fetch failure. */
    invalidateUrlCache?: (url: string) => void;
    /** Maximum download retries. @default 3 */
    maxRetries?: number;
    /** Base delay for exponential backoff in ms. @default 1000 */
    baseDelayMs?: number;
}

// ============================================================================
// Helpers
// ============================================================================

function makeKey(modelUrl: string): string {
    return `model:${modelUrl}`;
}

function baseUrl(modelUrl: string): string {
    const idx = modelUrl.lastIndexOf('/');
    return idx >= 0 ? modelUrl.substring(0, idx + 1) : '';
}

/**
 * Fetch a single URL with basic retry (no gateway re-resolution).
 * Used for weight shard fetches where the base URL is already known.
 */
async function fetchUrlWithRetry(
    url: string,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response;
        } catch (error) {
            lastError = error as Error;
            if (attempt === maxRetries - 1) throw error;

            const delay = baseDelayMs * Math.pow(2, attempt);
            console.warn(
                `[ModelCache] Fetch failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
                { url, error: String(error) }
            );
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Fetch model.json manifest + all weight shards, return as cache entry.
 *
 * On each retry attempt, invalidates any cached gateway resolution and re-resolves
 * the URL so the gateway manager can try different gateways.
 */
async function fetchModelArtifacts(
    modelUrl: string,
    resolveUrl?: (url: string) => Promise<string>,
    invalidateUrlCache?: (url: string) => void,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
): Promise<ModelCacheEntry> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Re-resolve on each attempt so the gateway manager can try different gateways
        const resolvedUrl = resolveUrl ? await resolveUrl(modelUrl) : modelUrl;

        try {
            const response = await fetch(resolvedUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const manifestText = await response.text();
            const manifest = JSON.parse(manifestText);

            const base = baseUrl(resolvedUrl);
            const weights: Record<string, ArrayBuffer> = {};

            // Collect all weight shard paths from the manifest
            const weightPaths: string[] = [];
            if (manifest.weightsManifest && Array.isArray(manifest.weightsManifest)) {
                for (const group of manifest.weightsManifest) {
                    if (group.paths && Array.isArray(group.paths)) {
                        for (const path of group.paths) {
                            weightPaths.push(path);
                        }
                    }
                }
            }

            // Fetch all weight shards in parallel using the same resolved base
            const fetchPromises = weightPaths.map(async (path) => {
                const shardUrl = base + path;
                const shardResponse = await fetchUrlWithRetry(shardUrl, maxRetries, baseDelayMs);
                weights[path] = await shardResponse.arrayBuffer();
            });

            await Promise.all(fetchPromises);

            return {
                manifest: manifestText,
                weights,
                savedAt: Date.now(),
                originalUrl: modelUrl,
            };
        } catch (error) {
            lastError = error as Error;
            if (attempt === maxRetries - 1) throw error;

            // Invalidate gateway cache so next resolveUrl call tries different gateways
            invalidateUrlCache?.(modelUrl);

            const delay = baseDelayMs * Math.pow(2, attempt);
            console.warn(
                `[ModelCache] Model fetch failed (attempt ${attempt + 1}/${maxRetries}), ` +
                `re-resolving and retrying in ${delay}ms...`,
                { url: modelUrl, resolvedUrl, error: String(error) }
            );
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Create a TF.js IOHandler that serves complete model artifacts from a cache entry.
 *
 * The model.json manifest contains modelTopology and weightsManifest.
 * The weightsManifest has groups, each with paths to shard files and weight specs.
 * We flatten all shard ArrayBuffers into a single weightData and collect all
 * weightSpecs into one array.
 */
function createIOHandler(
    _tfModule: typeof tf,
    entry: ModelCacheEntry
): tf.io.IOHandler {
    const manifest = JSON.parse(entry.manifest);

    return {
        load: async () => createModelArtifactsFromEntry(entry),
    };
}

/**
 * Convert a ModelCacheEntry into TF.js ModelArtifacts format.
 */
function createModelArtifactsFromEntry(entry: ModelCacheEntry): tf.io.ModelArtifacts {
    const manifest = JSON.parse(entry.manifest);
    const allWeightData: ArrayBuffer[] = [];
    const allWeightSpecs: tf.io.WeightsManifestEntry[] = [];

    if (manifest.weightsManifest && Array.isArray(manifest.weightsManifest)) {
        for (const group of manifest.weightsManifest) {
            if (group.weights && Array.isArray(group.weights)) {
                for (const spec of group.weights) {
                    allWeightSpecs.push(spec);
                }
            }
            if (group.paths && Array.isArray(group.paths)) {
                for (const path of group.paths) {
                    const buffer = entry.weights[path];
                    if (!buffer) {
                        throw new Error(`[ModelCache] Weight shard "${path}" not found in cache`);
                    }
                    allWeightData.push(buffer);
                }
            }
        }
    }

    return {
        modelTopology: manifest.modelTopology,
        format: manifest.format ?? 'graph-model',
        generatedBy: manifest.generatedBy,
        convertedBy: manifest.convertedBy,
        weightSpecs: allWeightSpecs.length > 0 ? allWeightSpecs : undefined,
        weightData: allWeightData.length > 0
            ? (allWeightData.length === 1 ? allWeightData[0] : allWeightData)
            : undefined,
    };
}

// ============================================================================
// Module-level TF.js IOHandler router for cached:// URLs
// ============================================================================

/** Map of cached:// URL → localForage store + key, populated by getOrFetchEssentiaUrl */
const cachedModelRegistry = new Map<string, { store: LocalForage; key: string }>();

let routerRegistered = false;

/**
 * Register a TF.js load router for the `cached://` scheme.
 * Called once at module init; the router checks cachedModelRegistry on each load.
 */
function ensureRouterRegistered(): void {
    if (routerRegistered) return;
    routerRegistered = true;

    // Dynamic import to get tf.io.registerLoadRouter at runtime
    // IORouter type says it always returns IOHandler, but the runtime
    // code checks for null to skip non-matching routers (see getLoadHandlers).
    import('@tensorflow/tfjs').then(tf => {
        tf.io.registerLoadRouter(((url: string | string[]) => {
            if (typeof url === 'string' && url.startsWith('cached://')) {
                const entry = cachedModelRegistry.get(url);
                if (entry) {
                    return {
                        load: async () => {
                            const cacheEntry = await entry.store.getItem<ModelCacheEntry>(entry.key);
                            if (!cacheEntry) {
                                throw new Error(`[ModelCache] Model not in cache: ${url}`);
                            }
                            return createModelArtifactsFromEntry(cacheEntry);
                        },
                    };
                }
            }
            return null;
        }) as any);
    });
}

ensureRouterRegistered();

// ============================================================================
// ModelCache
// ============================================================================

export class ModelCache {
    private store: LocalForage;

    constructor(options: ModelCacheOptions = {}) {
        this.store = localforage.createInstance({
            name: options.storeName ?? 'playlist-data-engine-models',
            description: options.description ?? 'Cached TF.js model artifacts for playlist-data-engine',
        });
    }

    /**
     * Check if a model is cached.
     */
    async has(modelUrl: string): Promise<boolean> {
        const entry = await this.store.getItem<ModelCacheEntry>(makeKey(modelUrl));
        return entry != null;
    }

    /**
     * Get cache metadata for a model (without loading it).
     */
    async getCacheInfo(modelUrl: string): Promise<{
        cached: boolean;
        savedAt?: number;
        size?: number;
    } | null> {
        const entry = await this.store.getItem<ModelCacheEntry>(makeKey(modelUrl));
        if (!entry) return { cached: false };

        let size = entry.manifest.length;
        for (const buf of Object.values(entry.weights)) {
            size += buf.byteLength;
        }

        return {
            cached: true,
            savedAt: entry.savedAt,
            size,
        };
    }

    /**
     * Load a GraphModel from cache (no network). Throws if not cached.
     */
    async loadFromCache(tfModule: typeof tf, modelUrl: string): Promise<tf.GraphModel> {
        const entry = await this.store.getItem<ModelCacheEntry>(makeKey(modelUrl));
        if (!entry) {
            throw new Error(`[ModelCache] Model not cached: ${modelUrl}`);
        }
        return tfModule.loadGraphModel(createIOHandler(tfModule, entry));
    }

    /**
     * Get or fetch a GraphModel with caching.
     *
     * - Cache hit: loads directly from IndexedDB (no network)
     * - Cache miss: resolves URL, fetches with retry, caches artifacts, then loads
     */
    async getOrFetchGraphModel(
        tfModule: typeof tf,
        modelUrl: string,
        options: ModelCacheFetchOptions = {}
    ): Promise<tf.GraphModel> {
        const key = makeKey(modelUrl);

        // Try cache first
        try {
            const entry = await this.store.getItem<ModelCacheEntry>(key);
            if (entry) {
                console.info(`[ModelCache] Loading model from cache: ${modelUrl}`);
                const model = await tfModule.loadGraphModel(createIOHandler(tfModule, entry));
                return model;
            }
        } catch (error) {
            console.warn('[ModelCache] Cache load failed, clearing and re-fetching:', error);
            await this.store.removeItem(key);
        }

        // Cache miss — fetch, cache, then load
        console.info(`[ModelCache] Downloading model: ${modelUrl}`);
        const entry = await fetchModelArtifacts(
            modelUrl,
            options.resolveUrl,
            options.invalidateUrlCache,
            options.maxRetries ?? 3,
            options.baseDelayMs ?? 1000
        );

        // Save to cache before loading (so we don't lose the download if load fails)
        await this.store.setItem(key, entry);
        console.info(`[ModelCache] Model cached: ${modelUrl} (${Object.keys(entry.weights).length} shards)`);

        return tfModule.loadGraphModel(createIOHandler(tfModule, entry));
    }

    /**
     * Get or fetch a model for use with Essentia constructors (TensorflowMusiCNN/VGGish).
     *
     * Uses tf.io.registerLoadRouter to register a custom IOHandler for `cached://`
     * URLs. When Essentia internally calls tf.loadGraphModel(cachedUrl), TF.js routes
     * to our handler which serves artifacts from localForage — zero network calls.
     *
     * On cache hit: returns `cached://` URL, zero network during Essentia init.
     * On cache miss: fetches with gateway fallback, caches, returns `cached://` URL.
     */
    async getOrFetchEssentiaUrl(
        modelUrl: string,
        options: ModelCacheFetchOptions = {}
    ): Promise<string> {
        const key = makeKey(modelUrl);
        const cachedUrl = `cached://${modelUrl}`;

        // Ensure model is cached (fetch if needed)
        const entry = await this.store.getItem<ModelCacheEntry>(key);
        if (!entry) {
            console.info(`[ModelCache] Downloading model for Essentia: ${modelUrl}`);
            const fetched = await fetchModelArtifacts(
                modelUrl,
                options.resolveUrl,
                options.invalidateUrlCache,
                options.maxRetries ?? 3,
                options.baseDelayMs ?? 1000
            );
            await this.store.setItem(key, fetched);
            console.info(`[ModelCache] Model cached: ${modelUrl} (${Object.keys(fetched.weights).length} shards)`);
        } else {
            console.info(`[ModelCache] Loading Essentia model from cache: ${modelUrl}`);
        }

        // Register this cached:// URL in the module-level registry
        cachedModelRegistry.set(cachedUrl, { store: this.store, key });

        return cachedUrl;
    }

    /**
     * Clear the cache for a specific model or all models.
     */
    async clear(modelUrl?: string): Promise<void> {
        if (modelUrl) {
            await this.store.removeItem(makeKey(modelUrl));
            console.info(`[ModelCache] Cleared cache for: ${modelUrl}`);
        } else {
            await this.store.clear();
            console.info('[ModelCache] Cleared all cached models');
        }
    }

    /**
     * List all cached model URLs.
     */
    async listCachedModels(): Promise<string[]> {
        const keys = await this.store.keys();
        return keys
            .filter(k => k.startsWith('model:'))
            .map(k => k.replace('model:', ''));
    }

    /**
     * Get total cache size in bytes.
     */
    async totalCacheSize(): Promise<number> {
        let total = 0;
        await this.store.iterate<ModelCacheEntry, void>((entry) => {
            if (entry) {
                total += entry.manifest.length;
                for (const buf of Object.values(entry.weights)) {
                    total += buf.byteLength;
                }
            }
        });
        return total;
    }
}

/** Singleton model cache instance used by default across the engine. */
export const modelCache = new ModelCache();
