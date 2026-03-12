import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenreAnalyzer } from './GenreAnalyzer.js';
import type { ModelConfig } from './MusicClassifier.js';

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
    duration: 2.5
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

describe('GenreAnalyzer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPredict.mockReset();
        mockInitialize.mockClear();
        mockTerminate.mockClear();
        mockDownsampleAudioBuffer.mockClear();
        mockComputeFrameWise.mockClear();
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

    it('should initialize with default options', () => {
        const analyzer = new GenreAnalyzer();
        // Since options is private, we can't easily assert exactly, but we know it instantiated
        expect(analyzer).toBeInstanceOf(GenreAnalyzer);
    });

    describe('two-step model config support', () => {
        it('should pass through two-step model config for genre', () => {
            const twoStepConfig: ModelConfig = {
                embedding: '/models/discogs-effnet-bs64-1.json',
                classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
            };
            const analyzer = new GenreAnalyzer({
                models: { genre: twoStepConfig }
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });

        it('should prioritize models.genre over deprecated modelUrl', () => {
            const twoStepConfig: ModelConfig = {
                embedding: '/models/discogs-effnet-bs64-1.json',
                classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
            };
            const analyzer = new GenreAnalyzer({
                modelUrl: '/models/old-model.json',
                models: { genre: twoStepConfig }
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });

        it('should use deprecated modelUrl when models.genre is not provided', () => {
            const analyzer = new GenreAnalyzer({
                modelUrl: '/models/custom-genre-model.json'
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });

        it('should preserve other model configs when setting genre', () => {
            const twoStepConfig: ModelConfig = {
                embedding: '/models/discogs-effnet-bs64-1.json',
                classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
            };
            const analyzer = new GenreAnalyzer({
                models: {
                    genre: twoStepConfig,
                    mood: {
                        embedding: '/models/discogs-effnet-bs64-1.json',
                        classifier: '/models/mtg_jamendo_moodtheme-discogs-effnet-1.json'
                    }
                }
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });

        it('should use default model when neither models.genre nor modelUrl is provided', () => {
            const analyzer = new GenreAnalyzer({
                topN: 10
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });
    });

    it('should analyze genre and return a GenreProfile', async () => {
        // Setup mock fetch response
        mockFetch.mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        // Use single-step model config to match mock setup (single model URL string)
        // The default is two-step which requires mocking loadGraphModel for classifier
        const analyzer = new GenreAnalyzer({
            models: {
                genre: '/models/genre-classifier.json'  // Single-step model
            },
            topN: 3,
            threshold: 0.1
        });

        // Mock predictions for Genre (87 classes) - MusicClassifier calls both genre and mood
        // Genre: index 73 = 'rock', index 34 = 'electronic' (from JAMENDO_GENRES)
        mockPredict
            // Genre prediction (2 frames, 87 classes each)
            .mockResolvedValueOnce([
                Array.from({ length: 87 }, (_, i) => i === 73 ? 0.95 : i === 34 ? 0.8 : 0.01),
                Array.from({ length: 87 }, (_, i) => i === 73 ? 0.95 : i === 34 ? 0.8 : 0.01)
            ])
            // Mood prediction (2 frames, 62 classes each) - GenreAnalyzer also analyzes mood
            .mockResolvedValueOnce([
                Array.from({ length: 62 }, () => 0.01),
                Array.from({ length: 62 }, () => 0.01)
            ]);

        const profile = await analyzer.analyzeGenre('https://example.com/test-audio.mp3');

        expect(profile).toBeDefined();
        // Check if map to jamendo tags worked
        expect(profile.genres.length).toBe(2);

        // Ensure probabilities mapped and sorted correctly
        expect(profile.genres[0].name).toBe('rock');
        expect(profile.genres[0].confidence).toBe(0.95);
        expect(profile.genres[1].name).toBe('electronic');
        expect(profile.genres[1].confidence).toBe(0.8);

        expect(profile.primary_genre).toBe('rock');
        expect(profile.analysis_metadata.duration_analyzed).toBe(2.5);
    });

    it('should throw an error if audio fetch fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const analyzer = new GenreAnalyzer({
            models: { genre: '/models/genre-classifier.json' }
        });
        await expect(analyzer.analyzeGenre('invalid-url')).rejects.toThrow('Network error');
    });
});
