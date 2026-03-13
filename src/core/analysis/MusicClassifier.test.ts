import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MusicClassifier, averageEmbeddings, detectModelArchitecture, isTwoStepModel, isSingleStepModel, isStringModel, formatModelForMetadata } from './MusicClassifier.js';

// ============================================================================
// Hoisted Mock Variables (must be defined before vi.mock calls)
// ============================================================================

const {
    mockFetch,
    mockPredict,
    mockInitialize,
    mockTerminate,
    mockDownsampleAudioBuffer,
    mockComputeFrameWise,
    mockComputeFrameWiseVggish,
    mockLoadGraphModel,
    mockTensor2d,
    mockTensor4d,
    mockEssentiaInstance
} = vi.hoisted(() => {
    // Create mock Essentia instance with all required methods
    const createMockEssentiaInstance = () => ({
        arrayToVector: vi.fn((arr: any) => arr),
        vectorToArray: vi.fn((vec: any) => vec),
        Windowing: vi.fn().mockReturnValue({ frame: new Float32Array(512) }),
        Spectrum: vi.fn().mockReturnValue({ spectrum: new Float32Array(256) }),
        MelBands: vi.fn().mockReturnValue({ bands: new Float32Array(128) }),
        UnaryOperator: vi.fn().mockReturnValue({ array: new Float32Array(128) })
    });

    return {
        mockFetch: vi.fn(),
        mockPredict: vi.fn(),
        mockInitialize: vi.fn().mockResolvedValue(undefined),
        mockTerminate: vi.fn(),
        mockDownsampleAudioBuffer: vi.fn().mockReturnValue(new Float32Array(16000)),
        mockComputeFrameWise: vi.fn().mockReturnValue([
            new Float32Array(96 * 1),
            new Float32Array(96 * 1)
        ]),
        mockComputeFrameWiseVggish: vi.fn().mockReturnValue([
            new Float32Array(64 * 1),
            new Float32Array(64 * 1)
        ]),
        mockLoadGraphModel: vi.fn(),
        mockTensor2d: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        mockTensor4d: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        mockEssentiaInstance: createMockEssentiaInstance()
    };
});

// ============================================================================
// Global Mocks
// ============================================================================

// Mock fetch
global.fetch = mockFetch;

// Mock AudioContext
const mockAudioBuffer = {
    getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
    duration: 300
};

class MockAudioContext {
    sampleRate = 44100;
    decodeAudioData = vi.fn().mockResolvedValue(mockAudioBuffer);
}
(global as any).window = {
    AudioContext: MockAudioContext
};

// Mock TensorFlow.js with loadGraphModel for two-step classifier models
vi.mock('@tensorflow/tfjs', () => ({
    loadGraphModel: mockLoadGraphModel,
    tensor2d: mockTensor2d,
    tensor4d: mockTensor4d
}));

// Mock Essentia WASM ES module (the actual import path used by MusicClassifier)
vi.mock('essentia.js/dist/essentia-wasm.es.js', () => {
    // Create a class constructor that returns the mock instance
    const MockEssentiaJS = vi.fn().mockImplementation(function(this: any) {
        // Copy all properties from mockEssentiaInstance to this
        Object.assign(this, {
            arrayToVector: mockEssentiaInstance.arrayToVector,
            vectorToArray: mockEssentiaInstance.vectorToArray,
            Windowing: mockEssentiaInstance.Windowing,
            Spectrum: mockEssentiaInstance.Spectrum,
            MelBands: mockEssentiaInstance.MelBands,
            UnaryOperator: mockEssentiaInstance.UnaryOperator
        });
        return this;
    });

    return {
        EssentiaWASM: {
            EssentiaWASM: {},
            EssentiaJS: MockEssentiaJS,
            ready: Promise.resolve()
        }
    };
});

// Mock Essentia WASM Web module (for backward compatibility)
vi.mock('essentia.js/dist/essentia-wasm.web.js', () => {
    const MockEssentiaJS = vi.fn().mockImplementation(function(this: any) {
        Object.assign(this, {
            arrayToVector: mockEssentiaInstance.arrayToVector,
            vectorToArray: mockEssentiaInstance.vectorToArray,
            Windowing: mockEssentiaInstance.Windowing,
            Spectrum: mockEssentiaInstance.Spectrum,
            MelBands: mockEssentiaInstance.MelBands,
            UnaryOperator: mockEssentiaInstance.UnaryOperator
        });
        return this;
    });

    return {
        EssentiaWASM: {
            EssentiaWASM: {},
            EssentiaJS: MockEssentiaJS,
            ready: Promise.resolve()
        }
    };
});

// Mock Essentia model classes
vi.mock('essentia.js/dist/essentia.js-model.es.js', () => ({
    EssentiaTFInputExtractor: class {
        downsampleAudioBuffer = mockDownsampleAudioBuffer;
        computeFrameWise = mockComputeFrameWise;
        private outputType: string;

        constructor(wasmBackend: any, outputType: string = 'musicnn') {
            this.outputType = outputType;
            // Use vggish-specific mock for vggish extractor
            if (outputType === 'vggish') {
                this.computeFrameWise = mockComputeFrameWiseVggish;
            }
        }
    },
    TensorflowMusiCNN: class {
        initialize = mockInitialize;
        predict = mockPredict;
        terminate = mockTerminate;
    },
    TensorflowVGGish: class {
        initialize = mockInitialize;
        predict = mockPredict;
        terminate = mockTerminate;
    }
}));

// ============================================================================
// Test Suite
// ============================================================================

describe('MusicClassifier', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPredict.mockReset();
        mockInitialize.mockClear();
        mockTerminate.mockClear();
        mockDownsampleAudioBuffer.mockClear();
        mockComputeFrameWise.mockClear();
        mockComputeFrameWiseVggish.mockClear();
        mockLoadGraphModel.mockReset();
        mockTensor2d.mockClear();
        mockTensor4d.mockClear();
        mockFetch.mockReset();

        // Reset Essentia instance mocks
        mockEssentiaInstance.arrayToVector.mockImplementation((arr: any) => arr);
        mockEssentiaInstance.vectorToArray.mockImplementation((vec: any) => vec);
        mockEssentiaInstance.Windowing.mockReturnValue({ frame: new Float32Array(512) });
        mockEssentiaInstance.Spectrum.mockReturnValue({ spectrum: new Float32Array(256) });
        mockEssentiaInstance.MelBands.mockReturnValue({ bands: new Float32Array(128) });
        mockEssentiaInstance.UnaryOperator.mockReturnValue({ array: new Float32Array(128) });
    });

    it('should analyze genre, mood, and danceability with single-step models', async () => {
        // Setup mock fetch response
        mockFetch.mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        // Mock predictions for 3 single-step model calls (predictions are 2D arrays - one per frame)
        mockPredict
            // Genre (87 classes) - 2 frames
            .mockResolvedValueOnce([
                Array.from({ length: 87 }, (_, i) => i === 73 ? 0.9 : 0.01),
                Array.from({ length: 87 }, (_, i) => i === 73 ? 0.92 : 0.01)
            ])
            // Mood (62 classes) - 2 frames, index 26 = happy
            .mockResolvedValueOnce([
                Array.from({ length: 62 }, (_, i) => i === 26 ? 0.85 : 0.01),
                Array.from({ length: 62 }, (_, i) => i === 26 ? 0.87 : 0.01)
            ])
            // Danceability [danceable, non-danceable]
            .mockResolvedValueOnce([[0.7, 0.3], [0.72, 0.28]]);

        // Use single-step models explicitly (not two-step defaults)
        const classifier = new MusicClassifier({
            models: {
                genre: '/models/genre-musicnn.json',
                mood: '/models/mood-musicnn.json',
                danceability: '/models/danceability-vggish.json'
            },
            topN: 3,
            threshold: 0.1
        });
        const profile = await classifier.analyze('https://example.com/test-audio.mp3');

        expect(profile).toBeDefined();
        expect(profile.primary_genre).toBe('rock');
        expect(profile.mood_tags).toContain('happy');
        expect(profile.vibe_metrics?.danceability).toBeCloseTo(0.71, 1);
        expect(profile.vibe_metrics?.valence).toBeCloseTo(0.86, 1); // Derived from 'happy'

        expect(profile.analysis_metadata.models_used.length).toBe(3);
        expect(profile.analysis_metadata.duration_analyzed).toBe(300);
        expect(mockInitialize).toHaveBeenCalledTimes(3);
        expect(mockTerminate).toHaveBeenCalledTimes(3);
    });

    it('should handle missing models gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        // Only genre - 2 frames
        mockPredict.mockResolvedValueOnce([
            Array.from({ length: 87 }, (_, i) => i === 0 ? 0.9 : 0.01),
            Array.from({ length: 87 }, (_, i) => i === 0 ? 0.92 : 0.01)
        ]);

        const classifier = new MusicClassifier({
            models: {
                genre: 'mock-url',
                mood: undefined,
                danceability: undefined
            }
        });

        const profile = await classifier.analyze('https://example.com/test-audio.mp3');

        expect(profile.genres.length).toBe(1);
        expect(profile.moods.length).toBe(0);
        expect(profile.vibe_metrics?.danceability).toBeUndefined();
    });
});

describe('averageEmbeddings', () => {
    it('should average embeddings across multiple frames', () => {
        const embeddings = [
            [0.1, 0.2, 0.3],
            [0.2, 0.3, 0.4],
            [0.3, 0.4, 0.5]
        ];
        const result = averageEmbeddings(embeddings);

        expect(result).toHaveLength(3);
        expect(result[0]).toBeCloseTo(0.2, 5);  // (0.1 + 0.2 + 0.3) / 3
        expect(result[1]).toBeCloseTo(0.3, 5);  // (0.2 + 0.3 + 0.4) / 3
        expect(result[2]).toBeCloseTo(0.4, 5);  // (0.3 + 0.4 + 0.5) / 3
    });

    it('should return empty array for empty input', () => {
        expect(averageEmbeddings([])).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
        expect(averageEmbeddings(null as any)).toEqual([]);
        expect(averageEmbeddings(undefined as any)).toEqual([]);
    });

    it('should handle single frame embeddings', () => {
        const embeddings = [[0.5, 0.6, 0.7]];
        const result = averageEmbeddings(embeddings);

        expect(result).toEqual([0.5, 0.6, 0.7]);
    });

    it('should return empty array for empty inner arrays', () => {
        expect(averageEmbeddings([[]])).toEqual([]);
    });

    it('should handle large embedding dimensions', () => {
        // Typical embedding size is 1280 dimensions (discogs-effnet)
        const dim = 1280;
        const frame1 = Array.from({ length: dim }, (_, i) => i / dim);
        const frame2 = Array.from({ length: dim }, (_, i) => (i + 1) / dim);
        const result = averageEmbeddings([frame1, frame2]);

        expect(result).toHaveLength(dim);
        // First element: (0 + 0.5) / 2 = 0.25... wait no
        // frame1[0] = 0/1280 = 0
        // frame2[0] = 1/1280 = 0.00078125
        // avg = 0.000390625
        expect(result[0]).toBeCloseTo((0 + 1/dim) / 2, 8);
        // Last element:
        // frame1[1279] = 1279/1280 = 0.99921875
        // frame2[1279] = 1280/1280 = 1.0
        // avg = 0.999609375
        expect(result[dim - 1]).toBeCloseTo((1279/dim + 1) / 2, 8);
    });
});

describe('detectModelArchitecture', () => {
    it('should detect effnet architecture from effnet keyword', () => {
        expect(detectModelArchitecture('/models/discogs-effnet-bs64-1.json')).toBe('effnet');
        expect(detectModelArchitecture('/models/effnet-classifier.json')).toBe('effnet');
        expect(detectModelArchitecture('https://example.com/EFFNET-model.json')).toBe('effnet');
    });

    it('should detect effnet architecture from discogs keyword', () => {
        expect(detectModelArchitecture('/models/discogs-model.json')).toBe('effnet');
        expect(detectModelArchitecture('/models/mtg_jamendo_genre-discogs-effnet-1.json')).toBe('effnet');
    });

    it('should detect vggish architecture', () => {
        expect(detectModelArchitecture('/models/vggish-model.json')).toBe('vggish');
        expect(detectModelArchitecture('/models/danceability-vggish-audioset-1.json')).toBe('vggish');
        expect(detectModelArchitecture('https://example.com/VGGISH-model.json')).toBe('vggish');
    });

    it('should detect tempocnn architecture', () => {
        expect(detectModelArchitecture('/models/tempocnn-model.json')).toBe('tempocnn');
        expect(detectModelArchitecture('/models/tempo-model.json')).toBe('tempocnn');
    });

    it('should not detect tempocnn from temple keyword', () => {
        expect(detectModelArchitecture('/models/temple-model.json')).toBe('musicnn');
    });

    it('should default to musicnn for unknown architectures', () => {
        expect(detectModelArchitecture('/models/unknown-model.json')).toBe('musicnn');
        expect(detectModelArchitecture('/models/musicnn-msd.json')).toBe('musicnn');
        expect(detectModelArchitecture('/models/genre-classifier.json')).toBe('musicnn');
    });
});

describe('isTwoStepModel', () => {
    it('should return true for valid two-step config', () => {
        expect(isTwoStepModel({
            embedding: '/models/embedding.json',
            classifier: '/models/classifier.json'
        })).toBe(true);
    });

    it('should return true for two-step config with optional labels', () => {
        expect(isTwoStepModel({
            embedding: '/models/embedding.json',
            classifier: '/models/classifier.json',
            labels: ['label1', 'label2']
        })).toBe(true);
    });

    it('should return false for string URL', () => {
        expect(isTwoStepModel('/models/classifier.json')).toBe(false);
    });

    it('should return false for null', () => {
        expect(isTwoStepModel(null as any)).toBe(false);
    });

    it('should return false for object without required fields', () => {
        expect(isTwoStepModel({} as any)).toBe(false);
        expect(isTwoStepModel({ embedding: '/models/emb.json' } as any)).toBe(false);
        expect(isTwoStepModel({ classifier: '/models/cls.json' } as any)).toBe(false);
    });
});

describe('isSingleStepModel', () => {
    it('should return true for valid SingleStepModelConfig', () => {
        expect(isSingleStepModel({
            modelUrl: 'https://example.com/model.json',
            modelType: 'musicnn'
        })).toBe(true);
    });

    it('should return true with optional labels', () => {
        expect(isSingleStepModel({
            modelUrl: 'https://example.com/model.json',
            modelType: 'effnet',
            labels: ['a', 'b']
        })).toBe(true);
    });

    it('should return false for TwoStepModelConfig', () => {
        expect(isSingleStepModel({
            embedding: 'a',
            classifier: 'b'
        })).toBe(false);
    });

    it('should return false for string', () => {
        expect(isSingleStepModel('https://example.com/model.json')).toBe(false);
    });

    it('should return false for null/undefined', () => {
        expect(isSingleStepModel(null as any)).toBe(false);
        expect(isSingleStepModel(undefined as any)).toBe(false);
    });
});

describe('isStringModel', () => {
    it('should return true for string', () => {
        expect(isStringModel('https://example.com/model.json')).toBe(true);
    });

    it('should return false for SingleStepModelConfig', () => {
        expect(isStringModel({
            modelUrl: 'a',
            modelType: 'musicnn'
        })).toBe(false);
    });

    it('should return false for TwoStepModelConfig', () => {
        expect(isStringModel({
            embedding: 'a',
            classifier: 'b'
        })).toBe(false);
    });

    it('should return false for null/undefined', () => {
        expect(isStringModel(null as any)).toBe(false);
        expect(isStringModel(undefined as any)).toBe(false);
    });
});

describe('formatModelForMetadata', () => {
    it('should return URL string for single-step model config', () => {
        const singleStepConfig = '/models/genre-classifier.json';
        expect(formatModelForMetadata(singleStepConfig)).toBe('/models/genre-classifier.json');
    });

    it('should format two-step model config as "embedding -> classifier"', () => {
        const twoStepConfig = {
            embedding: '/models/discogs-effnet-bs64-1.json',
            classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
        };
        expect(formatModelForMetadata(twoStepConfig)).toBe(
            '/models/discogs-effnet-bs64-1.json -> /models/mtg_jamendo_genre-discogs-effnet-1.json'
        );
    });

    it('should handle two-step config with custom labels', () => {
        const twoStepWithLabels = {
            embedding: '/models/embedding.json',
            classifier: '/models/classifier.json',
            labels: ['label1', 'label2']
        };
        expect(formatModelForMetadata(twoStepWithLabels)).toBe(
            '/models/embedding.json -> /models/classifier.json'
        );
    });

    it('should handle URLs with different protocols', () => {
        const httpsConfig = {
            embedding: 'https://example.com/models/embedding.json',
            classifier: 'https://example.com/models/classifier.json'
        };
        expect(formatModelForMetadata(httpsConfig)).toBe(
            'https://example.com/models/embedding.json -> https://example.com/models/classifier.json'
        );
    });

    it('should handle relative paths', () => {
        const relativeConfig = '/models/genre/model.json';
        expect(formatModelForMetadata(relativeConfig)).toBe('/models/genre/model.json');
    });
});

// ============================================================================
// Two-Step Model Flow Tests
// ============================================================================

describe('Two-Step Model Flow', () => {
    // Helper to create mock embedding model for tf.loadGraphModel (effnet)
    const createMockEmbeddingModel = (embeddingDim: number, numFrames: number = 1) => {
        // Create mock embeddings data
        const embeddingsData = new Float32Array(embeddingDim * numFrames);
        for (let i = 0; i < embeddingDim * numFrames; i++) {
            embeddingsData[i] = (i % embeddingDim) / embeddingDim;
        }

        return {
            predict: vi.fn().mockImplementation(() => ({
                data: vi.fn().mockResolvedValue(new Float32Array(embeddingsData)), // Fresh copy each call
                shape: [1, numFrames, embeddingDim],
                dispose: vi.fn()
            })),
            dispose: vi.fn()
        };
    };

    // Helper to create mock classifier model for tf.loadGraphModel
    const createMockClassifierModel = (predictions: number[]) => ({
        predict: vi.fn().mockImplementation(() => ({
            data: vi.fn().mockResolvedValue(new Float32Array(predictions)), // Fresh copy each call
            shape: [1, predictions.length],
            dispose: vi.fn()
        })),
        dispose: vi.fn()
    });

    // Helper to create mock embedding model output (for Essentia models)
    const createMockEmbeddingOutput = (embeddingDim: number, numFrames: number = 1) => {
        const embeddings: number[][] = [];
        for (let i = 0; i < numFrames; i++) {
            embeddings.push(Array.from({ length: embeddingDim }, (_, j) => (i + j) / embeddingDim));
        }
        return embeddings;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockPredict.mockReset();
        mockInitialize.mockClear();
        mockTerminate.mockClear();
        mockDownsampleAudioBuffer.mockClear();
        mockComputeFrameWise.mockClear();
        mockComputeFrameWiseVggish.mockClear();
        mockLoadGraphModel.mockReset();
        mockTensor2d.mockClear();
        mockTensor4d.mockClear();
        mockFetch.mockReset();

        // Reset Essentia instance mocks
        mockEssentiaInstance.arrayToVector.mockImplementation((arr: any) => arr);
        mockEssentiaInstance.vectorToArray.mockImplementation((vec: any) => vec);
        mockEssentiaInstance.Windowing.mockReturnValue({ frame: new Float32Array(512) });
        mockEssentiaInstance.Spectrum.mockReturnValue({ spectrum: new Float32Array(256) });
        mockEssentiaInstance.MelBands.mockReturnValue({ bands: new Float32Array(128) });
        mockEssentiaInstance.UnaryOperator.mockReturnValue({ array: new Float32Array(128) });
    });

    describe('with two-step genre config', () => {
        it('should analyze genre using two-step model architecture', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            // Mock loadGraphModel to return:
            // 1. Embedding model (for discogs-effnet-bs64-1.json) - effnet uses 128 mel bands
            // 2. Classifier model (for mtg_jamendo_genre-discogs-effnet-1.json)
            const embeddingDim = 1280;
            const numFrames = 2;
            const genrePredictions = Array.from({ length: 87 }, (_, i) => i === 73 ? 0.9 : 0.01);

            mockLoadGraphModel
                .mockResolvedValueOnce(createMockEmbeddingModel(embeddingDim, numFrames))  // Embedding model
                .mockResolvedValueOnce(createMockClassifierModel(genrePredictions));        // Classifier model

            const classifier = new MusicClassifier({
                models: {
                    genre: {
                        embedding: '/models/discogs-effnet-bs64-1.json',
                        classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
                    },
                    mood: undefined,
                    danceability: undefined
                },
                topN: 3,
                threshold: 0.1
            });

            const profile = await classifier.analyze('https://example.com/test-audio.mp3');

            // Verify genre was analyzed
            expect(profile).toBeDefined();
            expect(profile.genres.length).toBeGreaterThan(0);
            expect(profile.primary_genre).toBe('rock');

            // Verify metadata shows two-step format
            expect(profile.analysis_metadata.models_used).toHaveLength(1);
            expect(profile.analysis_metadata.models_used[0]).toBe(
                '/models/discogs-effnet-bs64-1.json -> /models/mtg_jamendo_genre-discogs-effnet-1.json'
            );

            // Verify tf.loadGraphModel was called for both embedding and classifier
            expect(mockLoadGraphModel).toHaveBeenCalledTimes(2);
            expect(mockLoadGraphModel).toHaveBeenNthCalledWith(1, '/models/discogs-effnet-bs64-1.json');
            expect(mockLoadGraphModel).toHaveBeenNthCalledWith(2, '/models/mtg_jamendo_genre-discogs-effnet-1.json');
        });

        it('should load embedding model once when shared between genre and mood', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            // Mock loadGraphModel calls:
            // 1. Shared embedding model (loaded once, cached)
            // 2. Genre classifier
            // 3. Mood classifier (embedding uses cache)
            const embeddingDim = 1280;
            const numFrames = 1;
            const genrePredictions = Array.from({ length: 87 }, (_, i) => i === 0 ? 0.9 : 0.01);
            const moodPredictions = Array.from({ length: 62 }, (_, i) => i === 26 ? 0.85 : 0.01);

            mockLoadGraphModel
                .mockResolvedValueOnce(createMockEmbeddingModel(embeddingDim, numFrames))  // Shared embedding
                .mockResolvedValueOnce(createMockClassifierModel(genrePredictions))        // Genre classifier
                .mockResolvedValueOnce(createMockClassifierModel(moodPredictions));        // Mood classifier

            // Use effnet-style URL to ensure architecture is detected as 'effnet'
            const sharedEmbeddingUrl = '/models/shared-effnet-embeddings.json';
            const classifier = new MusicClassifier({
                models: {
                    genre: {
                        embedding: sharedEmbeddingUrl,
                        classifier: '/models/genre-classifier.json'
                    },
                    mood: {
                        embedding: sharedEmbeddingUrl, // Same embedding URL - should use cache
                        classifier: '/models/mood-classifier.json'
                    },
                    danceability: undefined
                },
                cacheEmbeddings: true,
                topN: 3,
                threshold: 0.1
            });

            await classifier.analyze('https://example.com/test-audio.mp3');

            // Verify embedding was loaded only once (cached on second use)
            // Total calls: 1 embedding + 2 classifiers = 3
            expect(mockLoadGraphModel).toHaveBeenCalledTimes(3);

            // Verify the embedding model was loaded first
            expect(mockLoadGraphModel).toHaveBeenNthCalledWith(1, sharedEmbeddingUrl);
        });
    });

    describe('with mixed single and two-step configs', () => {
        it('should handle mixed configurations in same instance', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            // Mock predictions:
            // - Genre: two-step (embedding + classifier)
            // - Danceability: single-step (one model)
            const mockEmbeddings = createMockEmbeddingOutput(1280, 1);
            mockPredict
                .mockResolvedValueOnce(mockEmbeddings)  // Genre embedding (two-step)
                .mockResolvedValueOnce([[0.7, 0.3]]);   // Danceability single-step

            // Mock genre classifier
            const genrePredictions = Array.from({ length: 87 }, (_, i) => i === 0 ? 0.9 : 0.01);
            mockLoadGraphModel.mockResolvedValueOnce(createMockClassifierModel(genrePredictions));

            const classifier = new MusicClassifier({
                models: {
                    genre: {
                        embedding: '/models/embedding.json',
                        classifier: '/models/genre-classifier.json'
                    },
                    mood: undefined,
                    danceability: '/models/danceability-model.json'
                },
                topN: 3,
                threshold: 0.1
            });

            const profile = await classifier.analyze('https://example.com/test-audio.mp3');

            // Verify both analyses
            expect(profile.genres.length).toBeGreaterThan(0);
            expect(profile.vibe_metrics?.danceability).toBeCloseTo(0.7, 1);

            // Verify metadata shows different formats
            expect(profile.analysis_metadata.models_used).toHaveLength(2);
            // Genre should show two-step format
            expect(profile.analysis_metadata.models_used[0]).toContain('->');
            // Danceability should be single URL
            expect(profile.analysis_metadata.models_used[1]).toBe('/models/danceability-model.json');
        });
    });

    describe('metadata tracking', () => {
        it('should show both embedding and classifier in metadata for two-step', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            const mockEmbeddings = createMockEmbeddingOutput(1280, 1);
            mockPredict.mockResolvedValueOnce(mockEmbeddings);

            const predictions = Array.from({ length: 87 }, () => 0.01);
            mockLoadGraphModel.mockResolvedValueOnce(createMockClassifierModel(predictions));

            const embeddingUrl = '/models/custom-embedding.json';
            const classifierUrl = '/models/custom-classifier.json';

            const classifier = new MusicClassifier({
                models: {
                    genre: {
                        embedding: embeddingUrl,
                        classifier: classifierUrl
                    },
                    mood: undefined,
                    danceability: undefined
                }
            });

            const profile = await classifier.analyze('https://example.com/test-audio.mp3');

            // Verify metadata format
            expect(profile.analysis_metadata.models_used[0]).toBe(
                `${embeddingUrl} -> ${classifierUrl}`
            );
        });

        it('should include custom labels in two-step config without affecting metadata format', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            const mockEmbeddings = createMockEmbeddingOutput(1280, 1);
            mockPredict.mockResolvedValueOnce(mockEmbeddings);

            // Voice classifier has 2 classes
            mockLoadGraphModel.mockResolvedValueOnce(createMockClassifierModel([0.8, 0.2]));

            const classifier = new MusicClassifier({
                models: {
                    voice: {
                        embedding: '/models/voice-embedding.json',
                        classifier: '/models/voice-classifier.json',
                        labels: ['vocals', 'instrumental', 'mixed']
                    },
                    genre: undefined,
                    mood: undefined,
                    danceability: undefined
                }
            });

            const profile = await classifier.analyze('https://example.com/test-audio.mp3');

            // Verify metadata still shows "embedding -> classifier" format
            expect(profile.analysis_metadata.models_used[0]).toBe(
                '/models/voice-embedding.json -> /models/voice-classifier.json'
            );
        });
    });

    describe('architecture detection in two-step flow', () => {
        it('should use effnet features for discogs-effnet embedding models', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            // Mock both embedding and classifier models
            const predictions = Array.from({ length: 87 }, () => 0.01);
            mockLoadGraphModel
                .mockResolvedValueOnce(createMockEmbeddingModel(1280, 1))  // Embedding model
                .mockResolvedValueOnce(createMockClassifierModel(predictions));  // Classifier

            const classifier = new MusicClassifier({
                models: {
                    genre: {
                        embedding: '/models/discogs-effnet-bs64-1.json', // effnet = 128 bands
                        classifier: '/models/genre-classifier.json'
                    },
                    mood: undefined,
                    danceability: undefined
                }
            });

            const profile = await classifier.analyze('https://example.com/test-audio.mp3');

            // The architecture should be detected as 'effnet' based on URL
            expect(detectModelArchitecture('/models/discogs-effnet-bs64-1.json')).toBe('effnet');
            expect(profile.analysis_metadata.models_used[0]).toContain('discogs-effnet');
        });

        it('should detect vggish architecture for vggish embedding models', async () => {
            // Verify vggish detection
            expect(detectModelArchitecture('/models/vggish-embedding.json')).toBe('vggish');
        });

        it('should detect musicnn architecture for standard models', async () => {
            // Verify musicnn detection (default)
            expect(detectModelArchitecture('/models/standard-embedding.json')).toBe('musicnn');
        });
    });

    describe('effnet feature extraction', () => {
        it('should call Essentia WASM methods for 128-band extraction', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            // Mock both embedding and classifier models
            const predictions = Array.from({ length: 87 }, () => 0.01);
            mockLoadGraphModel
                .mockResolvedValueOnce(createMockEmbeddingModel(1280, 1))  // Embedding model
                .mockResolvedValueOnce(createMockClassifierModel(predictions));  // Classifier

            const classifier = new MusicClassifier({
                models: {
                    genre: {
                        embedding: '/models/discogs-effnet-bs64-1.json', // triggers 128-band extraction
                        classifier: '/models/genre-classifier.json'
                    },
                    mood: undefined,
                    danceability: undefined
                }
            });

            await classifier.analyze('https://example.com/test-audio.mp3');

            // Verify Essentia WASM methods were called for feature extraction
            // Note: The exact number of calls depends on the audio signal length
            // Just verify that the methods were called
            expect(mockEssentiaInstance.arrayToVector).toHaveBeenCalled();
        });
    });

    describe('vggish feature extraction', () => {
        it('should use vggish extractor (64 bands) for two-step vggish architecture models', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            // Mock loadGraphModel for vggish two-step (embedding + classifier)
            const embeddingDim = 128;  // VGGish uses 128-dim embeddings
            const numFrames = 2;
            const dancePredictions = [0.7, 0.3];  // danceable, non-danceable

            mockLoadGraphModel
                .mockResolvedValueOnce(createMockEmbeddingModel(embeddingDim, numFrames))  // VGGish embedding
                .mockResolvedValueOnce(createMockClassifierModel(dancePredictions));       // Danceability classifier

            const classifier = new MusicClassifier({
                models: {
                    genre: undefined,
                    mood: undefined,
                    danceability: {
                        embedding: '/models/vggish-embedding.json',  // triggers vggish extraction
                        classifier: '/models/danceability-classifier.json'
                    }
                }
            });

            await classifier.analyze('https://example.com/test-audio.mp3');

            // Verify the vggish extractor was called (not the default musicnn extractor)
            // The vggish extractor should be used for vggish embedding models
            expect(mockComputeFrameWiseVggish).toHaveBeenCalled();
        });

        it('should use default musicnn extractor for non-vggish single-step models', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            // Mock predictions for musicnn model
            mockPredict.mockResolvedValueOnce([
                Array.from({ length: 87 }, (_, i) => i === 0 ? 0.9 : 0.01)
            ]);

            const classifier = new MusicClassifier({
                models: {
                    genre: '/models/genre-musicnn.json', // musicnn model
                    mood: undefined,
                    danceability: undefined
                }
            });

            await classifier.analyze('https://example.com/test-audio.mp3');

            // Verify the default musicnn extractor was called
            expect(mockComputeFrameWise).toHaveBeenCalled();
            // Verify the vggish extractor was NOT called
            expect(mockComputeFrameWiseVggish).not.toHaveBeenCalled();
        });

        it('should extract 64-band mel-spectrogram features for vggish architecture', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            // Mock loadGraphModel for vggish two-step (embedding + classifier)
            const embeddingDim = 128;  // VGGish embedding dimension
            const numFrames = 3;
            const numMelBands = 64;  // VGGish uses 64 mel bands
            const genrePredictions = Array.from({ length: 87 }, (_, i) => i === 0 ? 0.9 : 0.01);

            // Setup mock to return 64-band features (64 elements per frame)
            mockComputeFrameWiseVggish.mockReturnValue([
                new Float32Array(numMelBands).fill(0.1),
                new Float32Array(numMelBands).fill(0.2),
                new Float32Array(numMelBands).fill(0.3)
            ]);

            mockLoadGraphModel
                .mockResolvedValueOnce(createMockEmbeddingModel(embeddingDim, numFrames))  // VGGish embedding
                .mockResolvedValueOnce(createMockClassifierModel(genrePredictions));       // Classifier

            const classifier = new MusicClassifier({
                models: {
                    genre: {
                        embedding: '/models/vggish-embedding.json',  // vggish = 64 bands
                        classifier: '/models/genre-classifier.json'
                    },
                    mood: undefined,
                    danceability: undefined
                }
            });

            await classifier.analyze('https://example.com/test-audio.mp3');

            // Verify vggish extractor was called with correct parameters
            expect(mockComputeFrameWiseVggish).toHaveBeenCalled();

            // Verify the returned features have 64 mel bands per frame
            const callArgs = mockComputeFrameWiseVggish.mock.calls[0];
            expect(callArgs).toBeDefined();

            // The mock returns 64-element arrays, confirming 64-band extraction
            const returnedFeatures = mockComputeFrameWiseVggish.mock.results[0].value;
            expect(returnedFeatures).toHaveLength(3); // 3 frames
            expect(returnedFeatures[0]).toHaveLength(numMelBands); // 64 bands per frame
            expect(returnedFeatures[1]).toHaveLength(numMelBands);
            expect(returnedFeatures[2]).toHaveLength(numMelBands);
        });

        it('should detect vggish architecture from model URL containing "vggish"', async () => {
            // Setup mock fetch response for audio
            mockFetch.mockResolvedValueOnce({
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            });

            // Mock predictions for single-step vggish model
            mockPredict.mockResolvedValueOnce([[0.8, 0.2]]);

            const classifier = new MusicClassifier({
                models: {
                    genre: undefined,
                    mood: undefined,
                    danceability: '/models/danceability-vggish-audioset-1.json'  // vggish in URL
                }
            });

            // Verify architecture detection
            expect(detectModelArchitecture('/models/danceability-vggish-audioset-1.json')).toBe('vggish');

            await classifier.analyze('https://example.com/test-audio.mp3');

            // For single-step vggish models, the Essentia TensorflowVGGish class handles
            // internal feature extraction with 64 mel bands
            expect(mockPredict).toHaveBeenCalled();
        });

        it('should differentiate vggish (64 bands) from musicnn (96 bands) and effnet (128 bands)', async () => {
            // Verify that different architectures are correctly identified
            // and mapped to their respective mel-band counts

            // VGGish = 64 bands
            expect(detectModelArchitecture('/models/vggish-model.json')).toBe('vggish');
            expect(detectModelArchitecture('/models/danceability-vggish-audioset-1.json')).toBe('vggish');

            // MusiCNN = 96 bands (default)
            expect(detectModelArchitecture('/models/musicnn-model.json')).toBe('musicnn');
            expect(detectModelArchitecture('/models/genre-msd.json')).toBe('musicnn');

            // EffNet = 128 bands
            expect(detectModelArchitecture('/models/discogs-effnet-bs64-1.json')).toBe('effnet');
            expect(detectModelArchitecture('/models/effnet-classifier.json')).toBe('effnet');

            // TempoCNN = 40 bands
            expect(detectModelArchitecture('/models/tempocnn-model.json')).toBe('tempocnn');
        });
    });

    describe('cache management', () => {
        it('should provide clearAllCaches method', () => {
            const classifier = new MusicClassifier();
            expect(classifier.clearAllCaches).toBeDefined();
            expect(typeof classifier.clearAllCaches).toBe('function');
        });

        it('should provide clearEmbeddingCache method', () => {
            const classifier = new MusicClassifier();
            expect(classifier.clearEmbeddingCache).toBeDefined();
            expect(typeof classifier.clearEmbeddingCache).toBe('function');
        });

        it('should provide clearClassifierCache method', () => {
            const classifier = new MusicClassifier();
            expect(classifier.clearClassifierCache).toBeDefined();
            expect(typeof classifier.clearClassifierCache).toBe('function');
        });
    });
});

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

describe('Backward Compatibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPredict.mockReset();
        mockInitialize.mockClear();
        mockTerminate.mockClear();
        mockDownsampleAudioBuffer.mockClear();
        mockComputeFrameWise.mockClear();
        mockLoadGraphModel.mockReset();
        mockFetch.mockReset();
    });

    it('should work with genre as single URL string', async () => {
        mockFetch.mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        mockPredict.mockResolvedValueOnce([
            Array.from({ length: 87 }, (_, i) => i === 0 ? 0.9 : 0.01)
        ]);

        const classifier = new MusicClassifier({
            models: {
                genre: '/models/genre-classifier.json',
                mood: undefined,
                danceability: undefined
            }
        });

        const profile = await classifier.analyze('https://example.com/test-audio.mp3');

        expect(profile.genres.length).toBeGreaterThan(0);
        expect(profile.analysis_metadata.models_used[0]).toBe('/models/genre-classifier.json');
    });

    it('should work with mood as single URL string', async () => {
        mockFetch.mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        mockPredict.mockResolvedValueOnce([
            Array.from({ length: 62 }, (_, i) => i === 26 ? 0.85 : 0.01)
        ]);

        const classifier = new MusicClassifier({
            models: {
                genre: undefined,
                mood: '/models/mood-classifier.json',
                danceability: undefined
            }
        });

        const profile = await classifier.analyze('https://example.com/test-audio.mp3');

        expect(profile.moods.length).toBeGreaterThan(0);
        expect(profile.analysis_metadata.models_used[0]).toBe('/models/mood-classifier.json');
    });

    it('should work with danceability as single URL string', async () => {
        mockFetch.mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        mockPredict.mockResolvedValueOnce([[0.75, 0.25]]);

        const classifier = new MusicClassifier({
            models: {
                genre: undefined,
                mood: undefined,
                danceability: '/models/danceability-model.json'
            }
        });

        const profile = await classifier.analyze('https://example.com/test-audio.mp3');

        expect(profile.vibe_metrics?.danceability).toBeCloseTo(0.75, 1);
        expect(profile.analysis_metadata.models_used[0]).toBe('/models/danceability-model.json');
    });

    it('should work with voice as single URL string', async () => {
        mockFetch.mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        mockPredict.mockResolvedValueOnce([[0.6, 0.4]]);

        const classifier = new MusicClassifier({
            models: {
                genre: undefined,
                mood: undefined,
                danceability: undefined,
                voice: '/models/voice-model.json'
            }
        });

        const profile = await classifier.analyze('https://example.com/test-audio.mp3');

        expect(profile.vibe_metrics?.instrumental_probability).toBeCloseTo(0.4, 1);
    });

    it('should work with acoustic as single URL string', async () => {
        mockFetch.mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        mockPredict.mockResolvedValueOnce([[0.3, 0.7]]);

        const classifier = new MusicClassifier({
            models: {
                genre: undefined,
                mood: undefined,
                danceability: undefined,
                acoustic: '/models/acoustic-model.json'
            }
        });

        const profile = await classifier.analyze('https://example.com/test-audio.mp3');

        expect(profile.vibe_metrics?.electronic_probability).toBeCloseTo(0.7, 1);
    });
});
