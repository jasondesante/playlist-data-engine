import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MusicClassifier } from './MusicClassifier.js';

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
