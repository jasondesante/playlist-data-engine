import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MusicClassifier, averageEmbeddings, detectModelArchitecture, isTwoStepModel } from './MusicClassifier.js';

// Mock fetch
global.fetch = vi.fn();

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

// Mock TensorFlow.js
vi.mock('@tensorflow/tfjs', () => ({}));

// Mock dynamically imported essentia.js modules
const mockPredict = vi.fn();
const mockInitialize = vi.fn().mockResolvedValue(undefined);
const mockTerminate = vi.fn();
const mockDownsampleAudioBuffer = vi.fn().mockReturnValue(new Float32Array(16000));
const mockComputeFrameWise = vi.fn().mockReturnValue([
    new Float32Array(96 * 1),
    new Float32Array(96 * 1)
]);

vi.mock('essentia.js/dist/essentia-wasm.web.js', () => ({
    EssentiaWASM: {
        EssentiaWASM: {}
    }
}));

vi.mock('essentia.js/dist/essentia.js-model.es.js', () => ({
    EssentiaTFInputExtractor: class {
        downsampleAudioBuffer = mockDownsampleAudioBuffer;
        computeFrameWise = mockComputeFrameWise;
    },
    TensorflowMusiCNN: class {
        initialize = mockInitialize;
        predict = mockPredict;
        terminate = mockTerminate;
    }
}));

describe('MusicClassifier', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPredict.mockReset();
        mockInitialize.mockClear();
        mockTerminate.mockClear();
        mockDownsampleAudioBuffer.mockClear();
        mockComputeFrameWise.mockClear();
    });

    it('should analyze genre, mood, and danceability', async () => {
        // Setup mock fetch response
        (global.fetch as any).mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        // Mock predictions for 3 models calls (predictions are 2D arrays - one per frame)
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

        const classifier = new MusicClassifier({ topN: 3, threshold: 0.1 });
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
        (global.fetch as any).mockResolvedValueOnce({
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
